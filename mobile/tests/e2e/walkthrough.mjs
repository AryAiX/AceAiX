#!/usr/bin/env node
/**
 * Signed-in walkthrough.
 *
 * Serves the exported web build, signs in as a demo account against the local
 * backend, walks every major screen, and reports anything that renders empty
 * or logs an error. Screenshots land in tests/e2e/shots/ so the run can be
 * reviewed by eye as well as by assertion.
 *
 *   node tests/e2e/walkthrough.mjs [--role athlete|coach] [--scheme light|dark]
 *
 * Expects `tools/local-supabase/start.sh` to be running and `dist/` to have
 * been exported against it.
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const SHOTS = path.join(HERE, 'shots');
const PORT = 8792;

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
};

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

async function visit(page, name, url, { wait = 1600, expect = [] } = {}) {
  const errors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text().slice(0, 240));
  });
  page.on('pageerror', (e) => {
    if (!IGNORE.test(e.message)) errors.push(`PAGEERROR ${e.message}`.slice(0, 240));
  });

  await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);

  const text = ((await page.evaluate(() => document.body.innerText)) ?? '').trim();
  await page.screenshot({ path: path.join(SHOTS, `${SCHEME}-${ROLE}-${LANG}-${name}.png`) });

  const missing = expect.filter((needle) => !text.toLowerCase().includes(needle.toLowerCase()));

  results.push({
    name,
    url,
    chars: text.length,
    head: text.slice(0, 110).replace(/\n/g, ' | '),
    errors,
    missing,
  });
}

const server = await serve();
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
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
await page.waitForTimeout(3600);

const signedIn = !(await page.evaluate(() => document.body.innerText)).includes('Welcome back');
if (!signedIn) {
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

// ---- the tour ---------------------------------------------------------------
const TOUR = [
  ['home', '/', { expect: ['Ace'] }],
  ['discover', '/discover', {}],
  ['opportunities', '/opportunities', {}],
  ['profile', '/profile', {}],
  ['score', '/score', {}],
  ['achievements', '/achievements', {}],
  ['notifications', '/notifications', {}],
  ['inbox', '/inbox', {}],
  ['search', '/search', {}],
  ['edit-profile', '/edit-profile', {}],
  ['settings', '/settings', {}],
  ['settings-privacy', '/settings/privacy', {}],
  ['settings-notifications', '/settings/notifications', {}],
  ['settings-appearance', '/settings/appearance', {}],
  ['settings-guardian', '/settings/guardian', {}],
  ['settings-blocked', '/settings/blocked', {}],
  ['settings-delete', '/settings/delete-account', {}],
  ['legal-terms', '/legal/terms', { expect: ['Terms of Service'] }],
  ['legal-privacy', '/legal/privacy', { expect: ['Privacy Policy'] }],
  ['legal-guidelines', '/legal/guidelines', { expect: ['Community Guidelines'] }],
  ['legal-child-safety', '/legal/child-safety', { expect: ['Child Safety'] }],
  ['profile-other', '/u/b0000000-0000-4000-8000-000000000001', { expect: ['Marco'] }],
  ['post', '/post/90000000-0000-4000-8000-000000000001', {}],
  ['opportunity', '/opportunity/80000000-0000-4000-8000-000000000001', { expect: ['trial'] }],
  ['org', '/org/e0000000-0000-4000-8000-000000000001', { expect: ['Academy'] }],
  ['chat', '/chat/70000000-0000-4000-8000-000000000001', {}],
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
  const thin = r.chars < 60;
  const bad = r.errors.length > 0 || r.missing.length > 0 || thin;
  if (bad) failures += 1;
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${r.name.padEnd(24)} ${String(r.chars).padStart(5)} chars  ${r.head}`);
  if (thin) console.log('         ! screen rendered almost nothing');
  for (const m of r.missing) console.log(`         ! expected to see "${m}"`);
  for (const e of r.errors) console.log(`         ! ${e}`);
}
console.log(`\n  ${results.length - failures}/${results.length} screens clean\n`);
process.exit(failures > 0 ? 1 : 0);
