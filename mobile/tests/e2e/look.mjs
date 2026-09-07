#!/usr/bin/env node
/**
 * Look at the built preview, and measure the things a screenshot argues about.
 *
 * Screenshots tell you whether a screen is dull. They do not tell you whether a
 * button is thirteen points left of centre — that is a measurement, and this
 * takes it: the tab bar's own box against the create button's, in page pixels.
 *
 *   node tests/e2e/look.mjs [--scheme dark|light]
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SHOTS = path.join(HERE, 'look-shots');
const PORT = 8801;

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const SCHEME = argOf('scheme', 'dark');

const wrapped = `<!doctype html><html><head><meta charset="utf-8" />` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `<style>:root{color-scheme:light dark}body{margin:0}img{max-width:100%}</style>` +
  `</head><body>${fs.readFileSync(path.join(ROOT, 'preview.html'), 'utf8')}</body></html>`;

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
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${SCHEME}-${name}.png`) });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3200);
await page.getByRole('button').last().click().catch(() => {});   // English
await page.waitForTimeout(2600);
await shot('01-welcome');

if ((await page.locator('input').count()) < 2) {
  const buttons = page.getByRole('button');
  for (let i = (await buttons.count()) - 1; i >= 0; i -= 1) {
    await buttons.nth(i).click().catch(() => {});
    await page.waitForTimeout(1000);
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
await page.waitForTimeout(1200);
await shot('02-home');

// ── the measurement ─────────────────────────────────────────────────────────
const geometry = await page.evaluate(() => {
  const create = document.querySelector('[data-testid="tab-create"]');
  if (!create) return { error: 'no create button' };
  // Walk up to the row that holds all five slots.
  let row = create.parentElement;
  while (row && row.children.length < 4) row = row.parentElement;
  const r = create.getBoundingClientRect();
  const b = row.getBoundingClientRect();
  const slots = [...row.children].map((el) => {
    const s = el.getBoundingClientRect();
    return { left: Math.round(s.left), width: Math.round(s.width) };
  });
  return {
    buttonCentre: Math.round((r.left + r.right) / 2),
    barCentre: Math.round((b.left + b.right) / 2),
    offBy: Math.round((r.left + r.right) / 2 - (b.left + b.right) / 2),
    slots,
  };
});
console.log('\n  tab bar geometry');
console.log(`    ${JSON.stringify(geometry)}`);

const go = async (href, name, wait = 2600) => {
  const link = page.locator(`a[href="${href}"]`).first();
  if ((await link.count()) === 0) {
    console.log(`    (no link to ${href})`);
    return;
  }
  await link.click().catch(() => {});
  await page.waitForTimeout(wait);
  await shot(name);
};

await go('/discover', '03-discover');
await go('/opportunities', '04-trials');
await go('/profile', '05-profile', 3200);

/* /score and /edit-profile are pushed, not linked, so they are reached the way
   a person reaches them: by tapping the thing on the profile that opens them. */
const tap = async (name, label, wait = 3000) => {
  const target = page.getByText(label, { exact: false }).first();
  if ((await target.count()) === 0) {
    console.log(`    (nothing matching "${label}")`);
    return false;
  }
  await target.click().catch(() => {});
  await page.waitForTimeout(wait);
  await shot(name);
  return true;
};

// The photo, full size.
await page.getByTestId('profile-avatar').first().click().catch(() => {});
await page.waitForTimeout(1500);
const lightboxOpen = (await page.getByTestId('lightbox-image').count()) > 0;
await shot('06-lightbox');
console.log(`    lightbox open: ${lightboxOpen}`);
if (lightboxOpen) {
  await page.getByTestId('lightbox-close').first().click().catch(() => {});
  await page.waitForTimeout(1100);
}

await tap('07-score', 'Talent Score', 3400);
/* Back through the screen's own header button. The runtime pins the address, so
   `goBack` leaves the app rather than the screen, and the tab bar only re-shows
   the tab this pushed screen is stacked on top of. */
await page.getByRole('button', { name: /back/i }).first().click().catch(() => {});
await page.waitForTimeout(2600);
await tap('08-edit-profile', 'Edit profile', 3600);
console.log(`    cover editor present: ${(await page.getByTestId('edit-cover').count()) > 0}`);

await browser.close();
server.close();
console.log(`\n  shots in ${SHOTS}\n`);
