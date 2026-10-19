#!/usr/bin/env node
/**
 * Screenshots of the club & academy screens (1014/01), signed in as the
 * people who use them. Expects `tools/local-supabase/start.sh` running and
 * `dist/` built against it.
 *
 *   node tests/e2e/club-look.mjs [--role academy|layla|sara|marco|omar] [--scheme dark|light] [--lang en]
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const ROLE = argOf('role', 'academy');
const SCHEME = argOf('scheme', 'dark');
const LANG = argOf('lang', 'en');
const SHOTS = argOf('out', path.join(HERE, 'club-shots'));
const PORT = Number(argOf('port', '8811'));
const PASSWORD = 'AceAiX-Demo-2026';

const ORG = 'e0000000-0000-4000-8000-000000000001';
const LIVE = 'f5000000-0000-4000-8000-000000000001';
const DONE = 'f5000000-0000-4000-8000-000000000003';
const TRIAL = 'f7000000-0000-4000-8000-000000000001';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(DIST, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, colorScheme: SCHEME });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`.slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|WebSocket|realtime|DevTools|shadow|pointerEvents|deprecated/i.test(m.text())) errors.push(m.text().slice(0, 300)); });

await page.goto(`http://localhost:${PORT}/sign-in`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const NATIVE = { en: 'English', ar: 'العربية', es: 'Español', fr: 'Français', de: 'Deutsch', ru: 'Русский', zh: '中文' };
if ((await page.evaluate(() => document.body.innerText)).includes('Choose your language')) {
  if (LANG !== 'en') { await page.getByRole('radio', { name: new RegExp(NATIVE[LANG]) }).click(); await page.waitForTimeout(300); }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1500);
  await page.goto(`http://localhost:${PORT}/sign-in`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}
const fields = page.locator('input');
await fields.nth(0).fill(`${ROLE}.demo@aceaix.com`);
await fields.nth(1).fill(PASSWORD);
await page.getByRole('button').last().click();
await page.waitForURL((u) => !u.pathname.includes('sign-in'), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2500);
for (let i = 0; i < 4; i += 1) {
  if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
  await page.getByRole('button').last().click().catch(() => {});
  await page.waitForTimeout(500);
}

async function shot(name, url, { wait = 2600, scroll = 0, tab = null } = {}) {
  if (url) {
    await page.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(wait);
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  }
  if (tab) {
    await page.getByText(new RegExp('^' + tab + '( \\d+)?$')).first().click().catch((e) => errors.push(`tab ${tab}: ${e.message.slice(0, 80)}`));
    await page.waitForTimeout(1800);
  }
  if (scroll) {
    await page.mouse.move(207, 600);
    await page.mouse.wheel(0, scroll);
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: path.join(SHOTS, `${ROLE}-${SCHEME}-${LANG}-${name}.png`) });
  const text = ((await page.evaluate(() => document.body.innerText)) ?? '').trim();
  console.log(`  ${name.padEnd(22)} ${text.length} chars · ${text.slice(0, 90).replace(/\n/g, ' | ')}`);
}

const plan = (argOf('plan', 'page')).split(',');
if (plan.includes('page')) {
  await shot('page-top', `/org/${ORG}`);
  await shot('page-scrolled', null, { scroll: 500 });
  for (const tab of ['Matches', 'Squads', 'Events', 'Challenges', 'Awards', 'About']) {
    await shot(`tab-${tab.toLowerCase()}`, `/org/${ORG}`, { tab, scroll: 420 });
  }
}
if (plan.includes('match')) {
  await shot('match-live', `/match/${LIVE}`);
  await shot('match-live-scrolled', null, { scroll: 600 });
  await shot('match-finished', `/match/${DONE}`);
}
if (plan.includes('event')) {
  await shot('event', `/event/${TRIAL}`);
  await shot('event-scrolled', null, { scroll: 600 });
}
if (plan.includes('manage')) {
  await shot('manage', `/club/${ORG}/manage`);
  await shot('team', `/club/${ORG}/team`);
  await shot('broadcast', `/club/${ORG}/broadcast`);
  await shot('squads', `/club/${ORG}/squads`);
  await shot('edit', `/club/${ORG}/edit`);
  await shot('match-edit', `/club/${ORG}/match-edit`);
  await shot('event-edit', `/club/${ORG}/event-edit`);
  await shot('award', `/club/${ORG}/award`);
  await shot('profile-tab', `/profile`);
}
if (plan.includes('top')) {
  await shot('page-top', `/org/${ORG}`);
  await shot('page-scrolled', null, { scroll: 500 });
}
if (plan.includes('setup')) {
  await shot('setup', `/club/setup`);
}

console.log(errors.length ? `\n  console errors:\n    ${[...new Set(errors)].join('\n    ')}` : '\n  no console errors');
await browser.close();
server.close();
