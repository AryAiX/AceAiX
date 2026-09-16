/**
 * What does the app print into the console on the way in?
 *
 * A warning nobody can act on is worse than none: it teaches everybody reading
 * the console to skim past warnings, and the next one will be real. This signs
 * in, walks a few screens, and lists everything the app said.
 *
 * It knows about one class of warning specifically. Importing
 * `expo-notifications` runs a module-scope subscription to device push token
 * changes, and on web that subscription exists only to warn about itself — so
 * the module is not imported there at all (see `lib/push.ts`). This asserts it
 * stays that way, because the failure is silent: the module comes back into the
 * web bundle through some new import, and nothing breaks except the console.
 *
 *   node tests/e2e/console.mjs [--light]
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = 8831;
const SCHEME = process.argv.includes('--light') ? 'light' : 'dark';

/* Warnings the app is not responsible for and cannot fix. */
const IGNORE = [
  /Download the React DevTools/i,
  /^\[Fast Refresh\]/,
  /favicon\.ico/i,
];

/* Anything matching these fails the run outright. */
const FORBIDDEN = [
  {
    pattern: /expo-notifications/i,
    why: 'expo-notifications is back in the web bundle — see lib/push.ts',
  },
];

const wrapped =
  `<!doctype html><html><head><meta charset="utf-8" />` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `<style>:root{color-scheme:light dark}body{margin:0}img{max-width:100%}</style>` +
  `</head><body>${fs.readFileSync(path.join(ROOT, 'preview.html'), 'utf8')}</body></html>`;

const server = http.createServer((_q, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(wrapped);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const messages = [];
page.on('console', (msg) => {
  const type = msg.type();
  if (type !== 'warning' && type !== 'error') return;
  const text = msg.text();
  if (IGNORE.some((re) => re.test(text))) return;
  messages.push({ type, text });
});
page.on('pageerror', (err) => messages.push({ type: 'pageerror', text: String(err) }));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3200);
await page.getByRole('button').last().click().catch(() => {});
await page.waitForTimeout(2600);
if ((await page.locator('input').count()) < 2) {
  const b = page.getByRole('button');
  for (let i = (await b.count()) - 1; i >= 0; i -= 1) {
    await b.nth(i).click().catch(() => {});
    await page.waitForTimeout(900);
    if ((await page.locator('input').count()) >= 2) break;
  }
}
await page.locator('input').nth(0).fill('layla.demo@aceaix.com');
await page.locator('input').nth(1).fill('AceAiX-Demo-2026');
await page.getByRole('button').last().click();
await page.waitForTimeout(4500);
for (let i = 0; i < 4; i += 1) {
  if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
  await page.getByRole('button').last().click().catch(() => {});
  await page.waitForTimeout(800);
}
await page.waitForTimeout(1500);

for (const href of ['/discover', '/meetups', '/opportunities', '/inbox', '/profile']) {
  const link = page.locator(`a[href="${href}"]`).first();
  if ((await link.count()) === 0) continue;
  await link.click().catch(() => {});
  await page.waitForTimeout(2400);
}

await browser.close();
server.close();

const counted = new Map();
for (const m of messages) {
  const key = `${m.type}: ${m.text.slice(0, 160)}`;
  counted.set(key, (counted.get(key) ?? 0) + 1);
}

console.log(`\n  console (${SCHEME})`);
if (counted.size === 0) {
  console.log('    clean — no warnings or errors\n');
} else {
  for (const [text, n] of counted) console.log(`    ${n > 1 ? `${n}× ` : ''}${text}`);
  console.log('');
}

const broke = [];
for (const rule of FORBIDDEN) {
  const hit = messages.find((m) => rule.pattern.test(m.text));
  if (hit) broke.push(`${rule.why}\n      ${hit.text.slice(0, 200)}`);
}
if (broke.length) {
  console.log('  forbidden:');
  for (const b of broke) console.log(`    ✗ ${b}`);
  console.log('');
  process.exitCode = 1;
}
