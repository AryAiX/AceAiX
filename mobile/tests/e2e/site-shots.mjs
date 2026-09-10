#!/usr/bin/env node
/**
 * Screens for the marketing site.
 *
 * The store screenshots in `store-assets/` are framed and captioned for Apple
 * and Google, at their pixel sizes. A website wants the bare screen at a size a
 * browser can embed. Same app, same harness, different crop — taken from the
 * built preview so what the site shows is what the build does, rather than a
 * mock that drifts a release later.
 *
 * Dark by default: it is the scheme the app was designed in, and a phone frame
 * on a light page reads better dark than light.
 *
 *   node tests/e2e/site-shots.mjs [--light]
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = process.env.SITE_SHOTS || path.join(HERE, 'site-shots');
const PORT = 8841;
const SCHEME = process.argv.includes('--light') ? 'light' : 'dark';

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
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 2,
  colorScheme: SCHEME,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: path.join(OUT, `${SCHEME}-${n}.png`) });

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
await page.waitForTimeout(1600);

const go = async (href, name, wait = 3000) => {
  const l = page.locator(`a[href="${href}"]`).first();
  if ((await l.count()) === 0) {
    console.log(`  (no link to ${href})`);
    return false;
  }
  await l.click().catch(() => {});
  await page.waitForTimeout(wait);
  await shot(name);
  console.log(`  ${name}`);
  return true;
};

const tap = async (label, name, wait = 3200) => {
  const target = page.getByText(label, { exact: false }).last();
  if ((await target.count()) === 0) {
    console.log(`  (nothing matching "${label}")`);
    return false;
  }
  await target.click().catch(() => {});
  await page.waitForTimeout(wait);
  await shot(name);
  console.log(`  ${name}`);
  return true;
};

const back = async () => {
  await page.getByRole('button', { name: /back/i }).first().click().catch(() => {});
  await page.waitForTimeout(2400);
};

console.log(`\n  site screens (${SCHEME})`);

await shot('feed');
console.log('  feed');
await go('/discover', 'discover');
await go('/meetups', 'play', 3400);
await tap('Saturday five-a-side', 'play-detail', 3200);
await back();
await go('/opportunities', 'trials');
await go('/profile', 'profile', 3400);
await tap('Talent Score', 'score', 3600);

await browser.close();
server.close();
console.log(`\n  in ${OUT}\n`);
