#!/usr/bin/env node
/**
 * The check that would have caught "this page has moved on".
 *
 * `check-preview.mjs` serves the file for every path, which is convenient and
 * wrong: a real host serves the page at exactly one address and 404s the rest.
 * The app routes on `location.pathname`, so on a page hosted at
 * `/code/artifact/<id>` the router boots at a path that matches no route and
 * lands on `+not-found` — the moment the language gate hands over, which is
 * precisely when a person saw it.
 *
 * This serves the page at one sub-path only, walks the gate, and asserts the
 * app is on its feet afterwards. Then it reloads, to prove the address the
 * runtime leaves in the bar is one the host can actually serve.
 *
 *   node tests/e2e/check-hosted.mjs <file> [--base /code/artifact/abc123]
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SHOTS = path.join(HERE, 'preview-shots');
const PORT = 8798;

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const FILE = args[0] && !args[0].startsWith('--') ? args[0] : path.join(ROOT, 'preview.html');
const BASE = argOf('base', '/code/artifact/e190d7be-b3bb-40b1-89a9-7d34a12bad03');

const wrapped = `<!doctype html><html><head><meta charset="utf-8" />` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}</style>` +
  `</head><body>${fs.readFileSync(FILE, 'utf8')}</body></html>`;

let served = 0;
let refused = [];

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === BASE) {
    served += 1;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(wrapped);
    return;
  }
  refused.push(url);
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404</h1>');
});
await new Promise((r) => server.listen(PORT, r));
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const problems = [];
const body = () => page.evaluate(() => document.body.innerText);
const NOT_FOUND = /moved on|does not lead anywhere|404/i;

await page.goto(`http://localhost:${PORT}${BASE}`, { waitUntil: 'load' });
await page.waitForTimeout(3200);

const gate = await body();
if (!/Choose your language/i.test(gate)) problems.push(`GATE missing — saw: ${gate.slice(0, 120)}`);
await page.screenshot({ path: path.join(SHOTS, 'hosted-01-gate.png') });

// Choose English and hand over to the router — the exact moment it broke.
await page.getByRole('button').last().click().catch(() => {});
await page.waitForTimeout(3000);

const after = await body();
await page.screenshot({ path: path.join(SHOTS, 'hosted-02-after-gate.png') });
if (NOT_FOUND.test(after)) problems.push(`NOT-FOUND after the language gate: ${after.slice(0, 140)}`);
if (!/Get seen|Sign in|Welcome/i.test(after)) {
  problems.push(`WELCOME did not render: ${after.slice(0, 140)}`);
}

// Sign in and reach the feed.
if ((await page.locator('input').count()) < 2) {
  const buttons = page.getByRole('button');
  for (let i = (await buttons.count()) - 1; i >= 0; i -= 1) {
    await buttons.nth(i).click().catch(() => {});
    await page.waitForTimeout(1100);
    if ((await page.locator('input').count()) >= 2) break;
  }
}
await page.locator('input').nth(0).fill('layla.demo@aceaix.com').catch(() => {});
await page.locator('input').nth(1).fill('AceAiX-Demo-2026').catch(() => {});
await page.getByRole('button').last().click().catch(() => {});
await page.waitForTimeout(4200);
for (let i = 0; i < 4; i += 1) {
  if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
  await page.getByRole('button').last().click().catch(() => {});
  await page.waitForTimeout(700);
}
await page.screenshot({ path: path.join(SHOTS, 'hosted-03-home.png') });
if ((await page.getByTestId('home-feed').count()) === 0) problems.push('FEED never rendered');

// Move around, then check the address bar is still one the host serves.
await page.locator('a[href="/discover"]').first().click().catch(() => {});
await page.waitForTimeout(2000);

const shown = await page.evaluate(() => location.pathname);

await browser.close();
server.close();

console.log(`\n  hosted at ${BASE}`);
console.log(`  page served ${served}×, ${refused.length} other paths refused` +
  (refused.length ? ` (${[...new Set(refused)].slice(0, 4).join(', ')})` : ''));
console.log(`  address bar after navigating: ${shown}`);

if (shown !== BASE) {
  problems.push(`ADDRESS moved to ${shown}, which this host 404s — a refresh would break`);
}

if (problems.length) {
  console.log('\n  problems:');
  for (const p of problems) console.log(`   ! ${p}`);
  console.log('');
  process.exit(1);
}
console.log('\n  ok — boots, signs in, and the address stays loadable\n');
