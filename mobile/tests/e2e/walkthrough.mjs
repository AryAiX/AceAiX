#!/usr/bin/env node
/**
 * Signed-in walkthrough.
 *
 * Serves the exported web build, signs in as a demo account against the local
 * backend, walks a smoke subset, and reports anything that renders empty or
 * logs an error. It is deliberately not the parity gate: the exhaustive route,
 * state and action inventory lives in tests/parity/screenManifest.ts.
 * Screenshots land in tests/e2e/shots/ for visual review.
 *
 *   node tests/e2e/walkthrough.mjs [--role athlete|coach] [--scheme light|dark]
 *
 * Expects `tools/local-supabase/start.sh` to be running and `dist/` to have
 * been exported against it.
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const SHOTS = path.join(HERE, 'shots');
const PORT = Number(process.env.WALKTHROUGH_PORT ?? 8792);

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const ROLE = argOf('role', 'athlete');
const SCHEME = argOf('scheme', 'light');
const LANG = argOf('lang', 'en');

const ACCOUNTS = {
  athlete: { email: 'layla.demo@aceaix.com', password: 'AceAiX-Demo-2026' },
  coach: { email: 'marco.demo@aceaix.com', password: 'AceAiX-Demo-2026' },
  club: { email: 'academy.demo@aceaix.com', password: 'AceAiX-Demo-2026' },
  guardian: { email: 'parent.demo@aceaix.com', password: 'AceAiX-Demo-2026' },
  minor: { email: 'mina.demo@aceaix.com', password: 'AceAiX-Demo-2026' },
};

function fromEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const env = { ...fromEnvFile(), ...process.env };

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml',
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(DIST, url);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

/** Console noise that says nothing about whether the screen works. */
const IGNORE =
  /Failed to load resource|net::ERR|favicon|WebSocket|realtime|Download the React DevTools|useNativeDriver|componentWill|shadow\*|props\.pointerEvents|"shadow"|deprecated/i;

const results = [];

async function visit(page, name, url, { wait = 1600, expect = [], minChars = 60 } = {}) {
  // A character count is only a smoke proxy for an empty screen. Chinese
  // expresses the same UI copy in materially fewer code points than the
  // alphabetic catalogues, so use a proportional threshold rather than
  // treating concise translated copy as a blank page.
  const effectiveMinChars = LANG === 'zh' ? Math.ceil(minChars * 0.5) : minChars;
  const errors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('requestfailed');
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text().slice(0, 240));
  });
  page.on('pageerror', (e) => {
    if (!IGNORE.test(e.message)) errors.push(`PAGEERROR ${e.message}`.slice(0, 240));
  });
  page.on('requestfailed', (request) => {
    const message = request.failure()?.errorText ?? 'request failed';
    if (!IGNORE.test(message)) {
      errors.push(`REQUESTFAILED ${request.url().slice(0, 150)} — ${message}`);
    }
  });

  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);
  // A linked project is slower than the local fixture this tour began with.
  // Let in-flight screen queries settle before the next navigation aborts them
  // and misattributes their rejection to the following screen.
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});

  let text = ((await page.evaluate(() => document.body.innerText)) ?? '').trim();
  let missing = expect.filter((needle) => !text.toLowerCase().includes(needle.toLowerCase()));
  if (text.length < effectiveMinChars || missing.length > 0 || /^Loading\b/i.test(text)) {
    await page.waitForTimeout(3000);
    text = ((await page.evaluate(() => document.body.innerText)) ?? '').trim();
    missing = expect.filter((needle) => !text.toLowerCase().includes(needle.toLowerCase()));
  }
  await page.screenshot({ path: path.join(SHOTS, `${SCHEME}-${ROLE}-${LANG}-${name}.png`) });

  results.push({
    name,
    url,
    chars: text.length,
    head: text.slice(0, 110).replace(/\n/g, ' | '),
    errors,
    missing,
    minChars: effectiveMinChars,
  });
}

const server = await serve();
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : {});
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
});
const page = await ctx.newPage();

// ---- language gate ----------------------------------------------------------
/* A fresh install shows the language picker before anything else. English is
   pre-selected from the browser locale, so this is one tap — but it has to
   happen, which is also a useful check that the gate really does come first. */
const account = ACCOUNTS[ROLE] ?? ACCOUNTS.athlete;
await page.goto(`http://localhost:${PORT}/sign-in`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const NATIVE_NAME = {
  en: 'English', ar: 'العربية', es: 'Español',
  fr: 'Français', de: 'Deutsch', ru: 'Русский', zh: '中文',
};

const gateVisible = (await page.evaluate(() => document.body.innerText)).includes(
  'Choose your language',
);
if (gateVisible) {
  await page.screenshot({ path: path.join(SHOTS, `${SCHEME}-${ROLE}-language-gate.png`) });
  if (LANG !== 'en') {
    await page.getByRole('radio', { name: new RegExp(NATIVE_NAME[LANG]) }).click();
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1200);
  await page.goto(`http://localhost:${PORT}/sign-in`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}

// ---- sign in ----------------------------------------------------------------
/* Placeholders and the button label are translated, so the sign-in form is
   driven positionally: two text inputs, then the last button on the screen. */
const fields = page.locator('input');
await fields.nth(0).fill(account.email);
await fields.nth(1).fill(account.password);
await page.getByRole('button').last().click();
await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 10_000 }).catch(() => {});

if (new URL(page.url()).pathname.includes('sign-in')) {
  console.error(`✗ could not sign in as ${account.email}`);
  await page.screenshot({ path: path.join(SHOTS, `${SCHEME}-${ROLE}-signin-failed.png`) });
  await browser.close();
  server.close();
  process.exit(1);
}

/* A brand-new account can legitimately open onto a celebration card. Dismiss
   whatever is queued so the tour photographs the screens themselves. */
for (let i = 0; i < 4; i += 1) {
  const overlay = page.getByTestId('celebration-overlay');
  if ((await overlay.count()) === 0) break;
  await page.getByRole('button').last().click().catch(() => {});
  await page.waitForTimeout(500);
}

// Detail screens used to point at fixed local-seed UUIDs. Against a linked dev
// project that made three healthy screens look broken and let two genuinely
// broken screens pass because their error copy was long enough. Resolve a real,
// visible row through the same API and role the browser is using instead.
const details = [];
if (env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  const api = createClient(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { data: auth, error: apiSignInError } = await api.auth.signInWithPassword(account);
  if (apiSignInError) throw apiSignInError;

  const first = async (query, label) => {
    const { data, error } = await query;
    if (error) throw new Error(`${label}: ${error.message}`);
    return data?.[0] ?? null;
  };

  const other = await first(
    api
      .from('user_profiles')
      .select('id, full_name')
      .neq('id', auth.user.id)
      .eq('is_discoverable', true)
      .limit(1),
    'find a visible profile',
  );
  const post = await first(
    api
      .from('posts')
      .select('id, caption, text')
      .eq('audience', 'public')
      .eq('is_hidden', false)
      .limit(1),
    'find a visible post',
  );
  const opportunity = await first(
    api.from('opportunities').select('id, title').eq('is_active', true).limit(1),
    'find an open opportunity',
  );
  const organization = await first(
    api.from('organizations').select('id, name').limit(1),
    'find a visible organization',
  );
  const team = await first(
    api.rpc('search_teams', { p_query: null, p_sport: null, p_limit: 1 }),
    'find a team',
  );
  const { data: conversations, error: conversationsError } = await api.rpc(
    'get_conversations',
    { p_limit: 1 },
  );
  if (conversationsError) throw conversationsError;

  if (other) {
    details.push([
      'profile-other',
      `/u/${other.id}`,
      { expect: [other.full_name], minChars: 60, wait: 3000 },
    ]);
    details.push([
      'profile-followers',
      `/u/${other.id}/followers`,
      { expect: LANG === 'en' ? ['Followers'] : [], minChars: 40, wait: 3000 },
    ]);
    details.push([
      'profile-following',
      `/u/${other.id}/following`,
      { expect: LANG === 'en' ? ['Following'] : [], minChars: 40, wait: 3000 },
    ]);
  }
  if (post) {
    details.push([
      'post',
      `/post/${post.id}`,
      { expect: [post.caption ?? post.text], minChars: 60, wait: 3000 },
    ]);
  }
  if (opportunity) {
    details.push([
      'opportunity',
      `/opportunity/${opportunity.id}`,
      { expect: [opportunity.title], minChars: 80, wait: 3000 },
    ]);
    details.push([
      'opportunity-applicants',
      `/opportunity/${opportunity.id}/applicants`,
      { minChars: 40, wait: 3000 },
    ]);
  }
  if (organization) {
    details.push([
      'org',
      `/org/${organization.id}`,
      { expect: [organization.name], minChars: 70, wait: 3000 },
    ]);
  }
  if (team) {
    details.push([
      'team',
      `/team/${team.id}`,
      { expect: [team.name], minChars: 60, wait: 3000 },
    ]);
  }
  if (conversations?.[0]?.id) {
    details.push([
      'chat',
      `/chat/${conversations[0].id}`,
      {
        expect: [conversations[0].other_name ?? 'conversation'],
        minChars: 60,
        wait: 3000,
      },
    ]);
  }
}

// ---- the tour ---------------------------------------------------------------
const TOUR = [
  ['home', '/', { expect: ['Ace'] }],
  ['discover', '/discover', {}],
  ['meetups', '/meetups', {}],
  ['opportunities', '/opportunities', {}],
  ['profile', '/profile', { wait: 3000 }],
  ['score', '/score', {}],
  ['achievements', '/achievements', {}],
  ['player-card', '/player-card', {}],
  ['views', '/views', {}],
  ['notifications', '/notifications', {}],
  // A valid inbox with one short conversation is intentionally sparse.
  ['inbox', '/inbox', { expect: LANG === 'en' ? ['Messages'] : [], minChars: 35 }],
  ['search', '/search', {}],
  ['edit-profile', '/edit-profile', { wait: 3000 }],
  ['settings', '/settings', {}],
  ['settings-account', '/settings/account', {}],
  ['settings-privacy', '/settings/privacy', {}],
  ['settings-notifications', '/settings/notifications', {}],
  ['settings-appearance', '/settings/appearance', {}],
  ['settings-language', '/settings/language', {}],
  ['settings-guardian', '/settings/guardian', {}],
  ['settings-scouting', '/settings/scouting', {}],
  ['settings-blocked', '/settings/blocked', {}],
  ['settings-delete', '/settings/delete-account', {}],
  ['challenges', '/challenges', {}],
  ['challenge-new', '/challenge/new', {}],
  ['meetup-new', '/meetup/new', {}],
  ['opportunity-new', '/opportunity/new', {}],
  ['legal-terms', '/legal/terms', { expect: LANG === 'en' ? ['Terms of Service'] : [] }],
  ['legal-privacy', '/legal/privacy', { expect: LANG === 'en' ? ['Privacy Policy'] : [] }],
  ['legal-guidelines', '/legal/guidelines', { expect: LANG === 'en' ? ['Community Guidelines'] : [] }],
  ['legal-child-safety', '/legal/child-safety', { expect: LANG === 'en' ? ['Child Safety'] : [] }],
  ...details,
  ['compose', '/compose', {}],
];

for (const [name, url, opts] of TOUR) {
  await visit(page, name, url, opts);
}

await browser.close();
server.close();

// ---- report -----------------------------------------------------------------
let failures = 0;
console.log(`\n  ${ROLE} · ${SCHEME} · ${LANG}\n`);
for (const r of results) {
  const thin = r.chars < r.minChars;
  const bad = r.errors.length > 0 || r.missing.length > 0 || thin;
  if (bad) failures += 1;
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${r.name.padEnd(24)} ${String(r.chars).padStart(5)} chars  ${r.head}`);
  if (thin) console.log('         ! screen rendered almost nothing');
  for (const m of r.missing) console.log(`         ! expected to see "${m}"`);
  for (const e of r.errors) console.log(`         ! ${e}`);
}
console.log(`\n  ${results.length - failures}/${results.length} screens clean\n`);
process.exit(failures > 0 ? 1 : 0);
