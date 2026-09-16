#!/usr/bin/env node
/**
 * Store screenshots, produced from the preview build.
 *
 * Both stores want images at exact pixel sizes, per language, showing real
 * screens with real data. Taking those by hand on a simulator is a morning's
 * work that has to be repeated for every language and every time a screen
 * changes — which is why the repository had none.
 *
 * This drives the same self-contained preview the artifact uses, at each store
 * slot's exact viewport, and writes a numbered set per language. No backend, no
 * simulator, no device.
 *
 *   node tests/e2e/store-screenshots.mjs [--file preview.html] [--langs en,ar]
 *
 * Output: store-assets/screenshots/<store>/<slot>/<lang>/NN-name.png
 *
 * The six shots are the ones a reviewer is looking for, per
 * docs/13-store-submission.md §3.2 — profile with the score, the score
 * breakdown, the feed, discovery, an opportunity, and the privacy settings.
 * Every account in them is an adult by deliberate choice: no minor's face
 * belongs in a store listing.
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const REPO = path.resolve(ROOT, '..');
const OUT = path.join(REPO, 'store-assets', 'screenshots');
const PORT = 8797;

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const FILE = path.resolve(argOf('file', path.join(ROOT, 'preview.html')));
const LANGS = argOf('langs', 'en,ar').split(',').map((s) => s.trim()).filter(Boolean);

/** The slots each store asks for, at the pixel sizes each store asks for. */
const SLOTS = [
  { store: 'app-store', slot: 'iphone-6.7', width: 1290, height: 2796, scale: 3 },
  { store: 'app-store', slot: 'iphone-6.5', width: 1242, height: 2688, scale: 3 },
  { store: 'play', slot: 'phone', width: 1080, height: 1920, scale: 3 },
];

const NATIVE = {
  en: 'English', ar: 'العربية', es: 'Español',
  fr: 'Français', de: 'Deutsch', ru: 'Русский', zh: '中文',
};

const DEMO = { email: 'layla.demo@aceaix.com', password: 'AceAiX-Demo-2026' };

const wrapped = `<!doctype html><html><head><meta charset="utf-8" />` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
  `<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}</style>` +
  `</head><body>${fs.readFileSync(FILE, 'utf8')}</body></html>`;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(wrapped);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let written = 0;

for (const slot of SLOTS) {
  for (const lang of LANGS) {
    const dir = path.join(OUT, slot.store, slot.slot, lang);
    fs.mkdirSync(dir, { recursive: true });

    const ctx = await browser.newContext({
      /* The store wants `width × height` in pixels. Rendering at a third of
         that with deviceScaleFactor 3 gives a phone-sized layout at
         phone-sized type, rather than a tablet layout scaled down. */
      viewport: {
        width: Math.round(slot.width / slot.scale),
        height: Math.round(slot.height / slot.scale),
      },
      deviceScaleFactor: slot.scale,
      colorScheme: 'dark',
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();

    const tap = async (locator, wait = 1500) => {
      await locator.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(wait);
    };
    const body = () => page.evaluate(() => document.body.innerText);

    let n = 0;
    const shot = async (name) => {
      n += 1;
      await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, '0')}-${name}.png`) });
      written += 1;
    };

    // ── in, past the language gate ──
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForTimeout(3200);
    if (lang !== 'en') {
      await tap(page.getByRole('radio', { name: new RegExp(NATIVE[lang]) }), 500);
    }
    await tap(page.getByRole('button').last(), 2400);

    // welcome → sign in, positionally, because the labels are translated
    if ((await page.locator('input').count()) < 2) {
      const buttons = page.getByRole('button');
      for (let i = (await buttons.count()) - 1; i >= 0; i -= 1) {
        await tap(buttons.nth(i), 1200);
        if ((await page.locator('input').count()) >= 2) break;
        await page.goBack().catch(() => {});
        await page.waitForTimeout(700);
      }
    }
    await page.locator('input').nth(0).fill(DEMO.email).catch(() => {});
    await page.locator('input').nth(1).fill(DEMO.password).catch(() => {});
    await tap(page.getByRole('button').last(), 4500);

    for (let i = 0; i < 4; i += 1) {
      if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
      await tap(page.getByRole('button').last(), 800);
    }

    const home = async () => {
      for (let i = 0; i < 5; i += 1) {
        if (/Got it|Dismiss/i.test(await body())) {
          await tap(page.getByRole('button', { name: /Got it|Dismiss/i }).first(), 800);
          continue;
        }
        await tap(page.locator('a[href="/"]').first(), 1300);
        if (await page.getByTestId('home-feed').isVisible().catch(() => false)) return;
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
        await page.waitForTimeout(2800);
      }
    };

    // 1. the feed, with what is happening this week above it
    await home();
    await shot('feed');

    // 2. the profile, score visible
    await tap(page.locator('a[href="/profile"]').first(), 2600);
    await shot('profile');

    // 3. the score breakdown
    await tap(page.getByText(/Talent Score|درجة|Puntuación|Score|Оценка|评分/).first(), 2800);
    await shot('talent-score');

    // 4. discovery
    await home();
    await tap(page.locator('a[href="/discover"]').first(), 2600);
    await shot('discover');

    // 5. an opportunity
    await tap(page.locator('a[href="/opportunities"]').first(), 2600);
    await shot('trials');

    // 6. the safety machinery a reviewer is looking for
    await home();
    await tap(page.getByTestId('home-notifications'), 2000);
    await shot('notifications');

    console.log(`  ${slot.store}/${slot.slot}/${lang}  ${n} shots`);
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\n  ${written} screenshots → ${path.relative(REPO, OUT)}\n`);
