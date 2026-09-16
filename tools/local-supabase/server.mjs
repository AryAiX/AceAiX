#!/usr/bin/env node
/**
 * A local stand-in for the Supabase API, for development and end-to-end tests.
 *
 * The hosted platform is GoTrue (auth) + PostgREST (data) + Storage behind one
 * origin. PostgREST is the real thing here; this process supplies the auth
 * endpoints `@supabase/supabase-js` calls, signs the JWTs PostgREST verifies,
 * and answers enough of the Storage API that uploads and image URLs work.
 *
 * It exists so the app can be run and tested against the real schema — the
 * same migrations, the same row-level security, the same RPCs — without Docker
 * and without touching a hosted project.
 *
 *   node tools/local-supabase/server.mjs
 *
 * Environment (all optional, defaults suit the local harness):
 *   PORT              8790
 *   PGRST_URL         http://127.0.0.1:3010
 *   JWT_SECRET        must match PostgREST's jwt-secret
 *   PGURI             postgres connection string for the dev.* auth functions
 */

import http from 'node:http';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const PORT = Number(process.env.PORT ?? 8790);
const PGRST_URL = process.env.PGRST_URL ?? 'http://127.0.0.1:3010';
const JWT_SECRET =
  process.env.JWT_SECRET ?? 'aceaix-local-development-jwt-secret-not-for-production';
const PSQL = process.env.PSQL ?? '/usr/lib/postgresql/16/bin/psql';
const PGHOST = process.env.PGHOST ?? '/var/lib/pgtest/run';
const PGPORT = process.env.PGPORT ?? '5433';
const PGDATABASE = process.env.PGDATABASE ?? 'aceaix_test';
const PGUSER = process.env.PGUSER ?? 'postgres';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'Content-Range, X-Client-Info',
};

// ── JWT (HS256) ──────────────────────────────────────────────────────────────
const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function sign(payload, expiresInSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + expiresInSeconds, iss: 'supabase-local', ...payload };
  const head = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(head).digest());
  return `${head}.${sig}`;
}

function verify(token) {
  if (!token || token.split('.').length !== 3) return null;
  const [h, p, s] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest());
  if (s !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const ANON_KEY = sign({ role: 'anon' }, 60 * 60 * 24 * 365 * 5);
export const SERVICE_KEY = sign({ role: 'service_role' }, 60 * 60 * 24 * 365 * 5);

// ── Talking to the dev.* auth functions ──────────────────────────────────────
async function pgJson(sql) {
  const { stdout } = await exec(
    PSQL,
    ['-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', PGDATABASE, '-tAqc', sql],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const quote = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`;

// ── Session shape supabase-js expects ────────────────────────────────────────
function session(user) {
  const access = sign({
    sub: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: user.user_metadata ?? {},
  });
  return {
    access_token: access,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `local-refresh-${user.id}`,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: user.user_metadata ?? {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    ...CORS,
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({ __raw: data });
      }
    });
  });
}

// ── Auth endpoints ───────────────────────────────────────────────────────────
async function handleAuth(req, res, url) {
  const path = url.pathname.replace('/auth/v1', '');

  if (path === '/token') {
    const grant = url.searchParams.get('grant_type');
    const body = await readBody(req);

    if (grant === 'refresh_token') {
      const id = String(body.refresh_token ?? '').replace('local-refresh-', '');
      const user = await pgJson(`select dev.get_user(${quote(id)}::uuid)`);
      if (!user) return send(res, 401, { error: 'invalid_grant', error_description: 'Invalid refresh token' });
      return send(res, 200, session(user));
    }

    const result = await pgJson(
      `select dev.sign_in(${quote(body.email)}, ${quote(body.password)})`,
    );
    if (!result?.ok) {
      return send(res, 400, {
        error: 'invalid_grant',
        error_description: result?.error ?? 'Invalid login credentials',
        message: result?.error ?? 'Invalid login credentials',
      });
    }
    return send(res, 200, session(result));
  }

  if (path === '/signup') {
    const body = await readBody(req);
    const meta = JSON.stringify(body.data ?? {});
    const result = await pgJson(
      `select dev.sign_up(${quote(body.email)}, ${quote(body.password)}, ${quote(meta)}::jsonb)`,
    );
    if (!result?.ok) {
      return send(res, 400, { error: 'signup_failed', message: result?.error ?? 'Could not sign up' });
    }
    // Local mode confirms e-mail immediately so the flow can be walked end to end.
    return send(res, 200, session(result));
  }

  if (path === '/user') {
    const claims = verify((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
    if (!claims?.sub) return send(res, 401, { message: 'Unauthorized' });

    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (body.password) {
        await pgJson(`select dev.set_password(${quote(claims.sub)}::uuid, ${quote(body.password)})`);
      }
    }
    const user = await pgJson(`select dev.get_user(${quote(claims.sub)}::uuid)`);
    if (!user) return send(res, 401, { message: 'Unauthorized' });
    return send(res, 200, session(user).user);
  }

  if (path === '/logout') return send(res, 204, '');
  if (path === '/recover' || path === '/resend') return send(res, 200, {});

  return send(res, 404, { message: `Local auth does not implement ${path}` });
}

// ── Storage endpoints ────────────────────────────────────────────────────────
/** A 1×1 transparent PNG, so an <Image> always resolves to something. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function handleStorage(req, res, url) {
  const path = url.pathname.replace('/storage/v1', '');

  // Public read: hand back a placeholder rather than 404ing the whole feed.
  if (req.method === 'GET' && path.startsWith('/object/public/')) {
    res.writeHead(200, { ...CORS, 'Content-Type': 'image/png', 'Cache-Control': 'max-age=60' });
    return res.end(PIXEL);
  }

  if (req.method === 'POST' && path.startsWith('/object/')) {
    // Consume the upload and acknowledge it; nothing is stored locally.
    await new Promise((resolve) => {
      req.on('data', () => {});
      req.on('end', resolve);
    });
    const key = path.replace('/object/', '');
    return send(res, 200, { Id: crypto.randomUUID(), Key: key });
  }

  if (req.method === 'POST' && path.includes('/sign/')) {
    const key = path.split('/sign/')[1] ?? '';
    return send(res, 200, { signedURL: `/object/public/${key}` });
  }

  return send(res, 200, {});
}

// ── PostgREST proxy ──────────────────────────────────────────────────────────
async function handleRest(req, res, url) {
  const target = PGRST_URL + url.pathname.replace('/rest/v1', '') + url.search;

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (['host', 'connection', 'content-length', 'apikey', 'x-client-info'].includes(k)) continue;
    headers[k] = v;
  }
  // A request with only the anon key still needs a bearer token PostgREST can read.
  if (!headers.authorization) headers.authorization = `Bearer ${ANON_KEY}`;

  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await new Promise((resolve) => {
          const chunks = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks)));
        });

  try {
    const upstream = await fetch(target, { method: req.method, headers, body });
    const text = await upstream.text();
    const out = {};
    for (const [k, v] of upstream.headers.entries()) {
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(k)) continue;
      // PostgREST sets its own CORS headers; keeping both produces a duplicate
      // Access-Control-Allow-Origin, which browsers reject outright.
      if (k.toLowerCase().startsWith('access-control-')) continue;
      out[k] = v;
    }
    Object.assign(out, CORS);
    res.writeHead(upstream.status, out);
    res.end(text);
  } catch (err) {
    send(res, 502, { message: `Local PostgREST is not reachable: ${err.message}` });
  }
}

// ── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url);
    if (url.pathname.startsWith('/storage/v1')) return await handleStorage(req, res, url);
    if (url.pathname.startsWith('/rest/v1')) return await handleRest(req, res, url);
    if (url.pathname.startsWith('/realtime/v1')) {
      // No websocket server locally; the client retries quietly and the app
      // falls back to its pull-to-refresh and focus-refetch paths.
      res.writeHead(501, CORS);
      return res.end();
    }
    if (url.pathname === '/functions/v1/talent-insights') {
      /* The same written fallback the deployed function produces when no
         ANTHROPIC_API_KEY is set, so the score screen reads the way it will in
         production rather than showing its unavailable state on every run. */
      const claims = verify(String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
      if (!claims?.sub) return send(res, 401, { message: 'Not signed in' });

      const row = await pgJson(
        `select to_jsonb(x) from (
           select ts.overall, ts.tier, ts.profile_score, ts.performance_score,
                  ts.media_score, ts.credibility_score, ts.engagement_score, ap.sport
             from public.talent_scores ts
             join public.athlete_profiles ap on ap.id = ts.athlete_id
            where ap.user_id = ${quote(claims.sub)}::uuid
         ) x`,
      );
      if (!row) return send(res, 200, { ok: true, summary: null, generated_by: 'template' });

      const pillars = {
        profile: row.profile_score,
        performance: row.performance_score,
        media: row.media_score,
        credibility: row.credibility_score,
        engagement: row.engagement_score,
      };
      const names = {
        profile: 'a filled-in profile',
        performance: 'your match record',
        media: 'your clips',
        credibility: 'verification and endorsements',
        engagement: 'how active you are',
      };
      const advice = {
        profile: 'Filling in the empty fields is the quickest thing left to do.',
        performance: 'Logging your recent matches is what moves it next.',
        media: 'Three short clips is the sweet spot — scouts open footage first.',
        credibility: 'An endorsement from a coach is worth more than anything you can type.',
        engagement: 'Posting once a week keeps you in front of the people looking.',
      };

      const entries = Object.entries(pillars);
      const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
      const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
      const overall = row.overall;
      const tier = row.tier;

      const opener =
        overall >= 70
          ? `A ${overall} puts you in the ${tier} band — a strong profile that a scout will stop on.`
          : overall >= 40
            ? `A ${overall} is a solid start. ${tier[0].toUpperCase()}${tier.slice(1)} tier means the foundations are there.`
            : `A ${overall} means your profile is still young. That is normal — almost everyone starts here.`;

      const summary =
        `${opener} Your strongest area is ${names[strongest[0]]}` +
        `${row.sport ? ` for ${String(row.sport).toLowerCase()}` : ''}. ${advice[weakest[0]]}`;

      return send(res, 200, { ok: true, summary, generated_by: 'template' });
    }
    if (url.pathname === '/functions/v1/guardian-consent') {
      return send(res, 200, { ok: true, sent: false, link: 'local-mode: e-mail not sent' });
    }
    if (url.pathname === '/health') {
      return send(res, 200, { ok: true, anonKey: ANON_KEY });
    }
    send(res, 404, { message: 'Not found' });
  } catch (err) {
    send(res, 500, { message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`local supabase   http://localhost:${PORT}`);
  console.log(`anon key         ${ANON_KEY}`);
});
