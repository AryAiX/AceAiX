#!/usr/bin/env node
/**
 * Records a self-contained demo of the exported web build.
 *
 * Drives the real app against the local backend and writes down every API
 * exchange it makes, keyed by (user, method, path, body). `build-preview.mjs`
 * then bakes those recordings into a single HTML file, so the app can be
 * opened anywhere — with no backend behind it — and still behave like itself.
 *
 *   node tests/e2e/record-demo.mjs
 *
 * Expects tools/local-supabase/start.sh to be running and dist/ to have been
 * exported against it.
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(HERE, 'recordings.json');
const PORT = 8794;
const API = 'http://localhost:8790';

const ACCOUNTS = [
  { role: 'athlete', email: 'layla.demo@aceaix.com' },
  { role: 'coach', email: 'marco.demo@aceaix.com' },
  { role: 'club', email: 'academy.demo@aceaix.com' },
  { role: 'guardian', email: 'parent.demo@aceaix.com' },
];
const PASSWORD = 'AceAiX-Demo-2026';

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

/** Who made the call, so two accounts asking the same question don't collide. */
function subjectOf(headers) {
  const auth = headers['authorization'] ?? headers['Authorization'];
  const token = auth?.replace(/^Bearer\s+/i, '') ?? headers['apikey'];
  if (!token) return 'anon';
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.sub ?? payload.role ?? 'anon';
  } catch {
    return 'anon';
  }
}

const recordings = new Map();

function keyOf(sub, method, target, body) {
  return [sub, method.toUpperCase(), target, body ?? ''].join(' ');
}

async function capture(response) {
  const request = response.request();
  const url = request.url();
  if (!url.startsWith(API)) return;
  // Storage objects are binary placeholders locally; the preview draws its own.
  if (url.includes('/storage/v1/')) return;

  const target = url.slice(API.length);
  const headers = await request.allHeaders();
  const sub = subjectOf(headers);
  const body = request.postData() ?? '';

  let text = '';
  try {
    text = await response.text();
  } catch {
    return;
  }

  const key = keyOf(sub, request.method(), target, body);
  if (!recordings.has(key)) {
    recordings.set(key, {
      sub,
      method: request.method().toUpperCase(),
      target,
      body,
      status: response.status(),
      contentRange: (await response.allHeaders())['content-range'] ?? null,
      response: text,
    });
  }
}

const TOUR = [
  '/', '/discover', '/opportunities', '/inbox', '/profile',
  '/score', '/achievements', '/notifications', '/search',
  '/edit-profile', '/settings', '/settings/privacy', '/settings/notifications',
  '/settings/appearance', '/settings/language', '/settings/guardian',
  '/settings/blocked', '/settings/delete-account',
  '/legal/terms', '/legal/privacy', '/legal/guidelines', '/legal/child-safety',
  '/u/b0000000-0000-4000-8000-000000000001',
  '/u/b0000000-0000-4000-8000-000000000002',
  '/u/c0000000-0000-4000-8000-000000000001',
  '/u/d0000000-0000-4000-8000-000000000001',
  '/u/a0000000-0000-4000-8000-000000000001',
  '/u/a0000000-0000-4000-8000-000000000002',
  '/u/a0000000-0000-4000-8000-000000000003',
  '/u/a0000000-0000-4000-8000-000000000004',
  '/u/a0000000-0000-4000-8000-000000000005',
  '/u/a0000000-0000-4000-8000-000000000006',
  '/post/90000000-0000-4000-8000-000000000001',
  '/post/90000000-0000-4000-8000-000000000002',
  '/post/90000000-0000-4000-8000-000000000003',
  '/post/90000000-0000-4000-8000-000000000004',
  '/post/90000000-0000-4000-8000-000000000005',
  '/opportunity/80000000-0000-4000-8000-000000000001',
  '/opportunity/80000000-0000-4000-8000-000000000002',
  '/opportunity/80000000-0000-4000-8000-000000000003',
  '/org/e0000000-0000-4000-8000-000000000001',
  '/org/e0000000-0000-4000-8000-000000000002',
  '/chat/70000000-0000-4000-8000-000000000001',
  '/compose',
];

const server = await serve();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const account of ACCOUNTS) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('response', (r) => capture(r).catch(() => {}));

  await page.goto(`http://localhost:${PORT}/sign-in`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const gate = (await page.evaluate(() => document.body.innerText)).includes('Choose your language');
  if (gate) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(1000);
    await page.goto(`http://localhost:${PORT}/sign-in`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  }

  const fields = page.locator('input');
  await fields.nth(0).fill(account.email);
  await fields.nth(1).fill(PASSWORD);
  await page.getByRole('button').last().click();
  await page.waitForTimeout(3800);

  const signedIn = !(await page.evaluate(() => document.body.innerText)).includes('Welcome back');
  if (!signedIn) {
    console.error(`  ✗ ${account.role}: sign-in failed`);
    await ctx.close();
    continue;
  }

  for (let i = 0; i < 4; i += 1) {
    if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
    await page.getByRole('button').last().click().catch(() => {});
    await page.waitForTimeout(400);
  }

  let visited = 0;
  for (const route of TOUR) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(900);
    visited += 1;
  }

  // Pull the search and discovery screens through their filters, so a tap in
  // the preview lands on something we already asked the real backend for.
  await page.goto(`http://localhost:${PORT}/search`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  for (const term of ['a', 'la', 'lay', 'mar', 'om', 'sa']) {
    await page.locator('input').first().fill(term).catch(() => {});
    await page.waitForTimeout(700);
  }

  console.log(`  ✓ ${account.role.padEnd(9)} ${visited} routes · ${recordings.size} exchanges so far`);
  await ctx.close();
}

await browser.close();
server.close();

const list = [...recordings.values()];
fs.writeFileSync(OUT, JSON.stringify(list));
const bytes = fs.statSync(OUT).size;
console.log(`\n  ${list.length} exchanges · ${(bytes / 1024).toFixed(0)} kB → ${path.relative(ROOT, OUT)}\n`);
