#!/usr/bin/env node
/**
 * Proves the baked preview works with nothing behind it.
 *
 * Serves preview.html the way a hosted page is served — one file, no API, no
 * server routes — then signs in and taps through the app the way a person
 * would, failing on any request that tries to leave the page. Screenshots land
 * in tests/e2e/preview-shots/.
 *
 *   node tests/e2e/check-preview.mjs <file> [--role athlete|coach|club|guardian]
 *                                           [--scheme light|dark] [--lang en|ar|…]
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SHOTS = path.join(HERE, 'preview-shots');
const PORT = 8795;

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const FILE = args[0] && !args[0].startsWith('--') ? args[0] : path.join(ROOT, 'preview.html');
const ROLE = argOf('role', 'athlete');
const SCHEME = argOf('scheme', 'dark');
const LANG = argOf('lang', 'en');

const EMAIL = {
  athlete: 'layla.demo@aceaix.com',
  coach: 'marco.demo@aceaix.com',
  club: 'academy.demo@aceaix.com',
  guardian: 'parent.demo@aceaix.com',
}[ROLE];

const NATIVE = { en: 'English', ar: 'العربية', es: 'Español', fr: 'Français', de: 'Deutsch', ru: 'Русский', zh: '中文' };

const wrapped = `<!doctype html><html><head><meta charset="utf-8" />` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `<style>:root{color-scheme:light}body{margin:0;font:14px system-ui;background:#faf9f7}` +
  `img{max-width:100%}[hidden]{display:none!important}</style></head><body>` +
  fs.readFileSync(FILE, 'utf8') + `</body></html>`;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(wrapped);
});
await new Promise((r) => server.listen(PORT, r));
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const problems = [];
let at = 'boot';
const IGNORE = /favicon|React DevTools|useNativeDriver|componentWill|shadow\*|props\.pointerEvents|"shadow"|deprecated|Unexpected text node|findDOMNode/i;
page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) problems.push(`[${at}] ` + m.text().slice(0, 200)); });
page.on('pageerror', (e) => { if (!IGNORE.test(e.message)) problems.push(`[${at}] PAGEERROR ${e.message}`.slice(0, 240) + ' :: ' + String(e.stack||'').split('\n')[1]); });
page.on('request', (r) => {
  const u = r.url();
  if (/^https?:/.test(u) && !u.startsWith(`http://localhost:${PORT}`)) problems.push(`LEAKED ${u.slice(0, 120)}`);
});

const seen = [];
const body = () => page.evaluate(() => document.body.innerText);
let step = 0;
async function shot(name) {
  step += 1;
  at = name;
  const file = `${SCHEME}-${ROLE}-${LANG}-${String(step).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SHOTS, file) });
  const t = (await body()).trim();
  seen.push({ name, chars: t.length, head: t.slice(0, 80).replace(/\s+/g, ' ') });
}

const tap = async (locator, wait = 1400) => {
  await locator.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(wait);
};
const back = () => tap(page.getByRole('button').first(), 1200);

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);

if (!/Choose your language|اختر|Elige|Choisis|Wähle|Выбери|选择|语言/i.test(await body())) {
  problems.push('GATE did not appear first');
}
await shot('language-gate');

if (LANG !== 'en') await tap(page.getByRole('radio', { name: new RegExp(NATIVE[LANG]) }), 500);
await tap(page.getByRole('button').last(), 2200);
await shot('welcome');

/* Reach the sign-in form without depending on translated labels. */
let reached = (await page.locator('input').count()) >= 2;
if (!reached) {
  const buttons = page.getByRole('button');
  for (let i = (await buttons.count()) - 1; i >= 0 && !reached; i -= 1) {
    await tap(buttons.nth(i), 1200);
    reached = (await page.locator('input').count()) >= 2;
    if (!reached) { await page.goBack().catch(() => {}); await page.waitForTimeout(700); }
  }
}
if (!reached) problems.push('SIGN-IN form unreachable');

await shot('sign-in');
await page.locator('input').nth(0).fill(EMAIL).catch(() => {});
await page.locator('input').nth(1).fill('AceAiX-Demo-2026').catch(() => {});
await tap(page.getByRole('button').last(), 4200);

for (let i = 0; i < 5; i += 1) {
  if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
  await shot(`celebration-${i + 1}`);
  await tap(page.getByRole('button').last(), 800);
}

if ((await page.getByTestId('home-screen').count()) === 0) problems.push('HOME never rendered after sign-in');
await shot('home');

// Anything that opens over the app is closed by its own control, and the tour
// only carries on once the feed is back in front.
const OVERLAY = /Got it|Dismiss|Keep going/i;
async function ensureHome() {
  for (let i = 0; i < 6; i += 1) {
    if (OVERLAY.test(await body())) {
      await tap(page.getByRole('button', { name: OVERLAY }).first(), 900);
      continue;
    }
    await tap(page.locator('a[href="/"]').first(), 1300);
    if (await page.getByTestId('home-feed').isVisible().catch(() => false)) return true;

    /* A reload is a legitimate reset: the preview pins the address, so this
       boots the app at home the same way a person reopening the tab would. */
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    if (await page.getByTestId('home-feed').isVisible().catch(() => false)) return true;
  }
  problems.push('STUCK — could not get back to the feed');
  return false;
}

// Home → notifications, messages, streak
await tap(page.getByTestId('home-notifications'), 1800); await shot('notifications'); await back(); await ensureHome();
await tap(page.getByTestId('home-messages'), 1800); await shot('inbox'); await back(); await ensureHome();
await tap(page.getByTestId('home-streak'), 1500); await shot('streak'); await ensureHome();

// The centre button is a modal composer, not a route.
await tap(page.getByTestId('tab-create'), 1600); await shot('create'); await back(); await ensureHome();

// A post, from the feed
await tap(page.getByText('Two goals away', { exact: false }).first(), 2000); await shot('post'); await back(); await ensureHome();

// Discover → an athlete
await tap(page.locator('a[href="/discover"]').first(), 2400); await shot('discover');
await tap(page.getByText(/Sara Nouri|Daniel Okoro|Omar Farouk|Yusuf Rahimi/).first(), 2400);
await shot('athlete-profile'); await back();

// Trials → an opportunity
await tap(page.locator('a[href="/opportunities"]').first(), 2400); await shot('opportunities');
await tap(page.getByText(/open trial|Goalkeeper trial|recruitment/i).first(), 2400);
await shot('opportunity'); await back();

// Trials → challenges
await tap(page.locator('a[href="/opportunities"]').first(), 2200);
await tap(page.getByText(/Challenges|Retos|Défis|Испытания|挑战|التحديات|Aufgaben/).first(), 2400);
await shot('challenges');
await tap(page.getByText(/keep-ups|Keep-ups/i).first(), 2400);
await shot('challenge-detail');
await ensureHome();

// You → the profile, the score, the achievements, the settings
await tap(page.locator('a[href="/profile"]').first(), 2400); await shot('profile');
await tap(page.getByText(/Talent Score|Your score/i).first(), 2600); await shot('score');
await ensureHome();
await tap(page.locator('a[href="/profile"]').first(), 2000);
await tap(page.getByText(/Achievement|Badges/i).first(), 2400); await shot('achievements');
await ensureHome();
await tap(page.locator('a[href="/profile"]').first(), 2000);
await tap(page.getByText(/Player card/i).first(), 3000); await shot('player-card');
await ensureHome();
await tap(page.locator('a[href="/profile"]').first(), 2000);
await tap(page.getByText(/Real Madrid/).first(), 2400); await shot('team');
await ensureHome();
await tap(page.getByText(/looked at your profile/i).first(), 2400); await shot('views');
await ensureHome();
await tap(page.getByTestId('home-theme'), 1400); await shot('theme-toggled');

await browser.close();
server.close();

console.log(`\n  preview · ${ROLE} · ${SCHEME} · ${LANG}\n`);
let thin = 0;
for (const s of seen) {
  const isThin = s.chars < 60;
  if (isThin) thin += 1;
  console.log(`  ${isThin ? 'THIN' : 'ok  '} ${s.name.padEnd(20)} ${String(s.chars).padStart(5)}  ${s.head}`);
}
const unique = [...new Set(problems)];
if (unique.length) {
  console.log('\n  problems:');
  for (const p of unique.slice(0, 30)) console.log(`   ! ${p}`);
}
console.log(`\n  ${seen.length - thin}/${seen.length} views rendered · ${unique.length} problems\n`);
process.exit(unique.length || thin ? 1 : 0);
