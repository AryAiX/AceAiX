/**
 * Does anything touch the edge of a card?
 *
 * Walks the built preview screen by screen, finds every card-like surface — a
 * box with its own background and a corner radius — and measures the gap
 * between it and the nearest thing drawn inside it. Anything closer than MIN
 * is reported with the screen it was found on.
 *
 * This exists because `Card padded={false}` and `ListItem` are each correct on
 * their own and wrong together: the card is unpadded so its dividers can run
 * edge to edge, which leaves every row paying for its own margin, and rows are
 * flush by default because nearly all of them live in a Sheet or a
 * SettingsGroup that already insets them. Put the two together and the avatar
 * sits flat against the border — which is how "Who looked at your profile"
 * ended up cramped while every other card on the same screen breathed. Reading
 * either file tells you nothing; measuring the built app tells you at once.
 *
 * The SegmentedControl reports a 4px gutter around its thumb. That is the
 * control's own design — a pill inside a track — not a card edge.
 *
 *   node tests/e2e/cards.mjs [--light]
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = process.env.PROBE_OUT || path.join(HERE, 'card-shots');
const PORT = 8827;
const SCHEME = process.argv.includes('--light') ? 'light' : 'dark';
const MIN = 6;

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

const MEASURE = (min) => {
  const isCard = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 80 || r.height < 32) return false;
    if (r.width >= window.innerWidth - 1) return false; // full-bleed: a screen, not a card
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    if (radius < 8) return false;
    const bg = cs.backgroundColor;
    const bordered = (parseFloat(cs.borderTopWidth) || 0) > 0;
    return (bg && bg !== 'rgba(0, 0, 0, 0)') || bordered;
  };

  const paints = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (el.tagName === 'svg' || el.tagName === 'IMG') return true;
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return true;
    // A text node of its own
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  };

  const hits = [];
  for (const card of document.querySelectorAll('*')) {
    if (!isCard(card)) continue;
    const cr = card.getBoundingClientRect();
    /* A card inside a card would report its parent's padding as its own gap. */
    let nested = false;
    for (let p = card.parentElement; p; p = p.parentElement) {
      if (isCard(p)) { nested = true; break; }
    }
    if (nested) continue;

    let worst = null;
    for (const el of card.querySelectorAll('*')) {
      if (!paints(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width >= cr.width - 0.5) continue; // a full-width row: its children are what matter
      const left = r.left - cr.left;
      const right = cr.right - r.right;
      const gap = Math.min(left, right);
      if (gap < min && (!worst || gap < worst.gap)) {
        worst = {
          gap: Math.round(gap * 10) / 10,
          side: left < right ? 'left' : 'right',
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
        };
      }
    }
    if (worst) {
      hits.push({
        card: {
          y: Math.round(cr.top),
          w: Math.round(cr.width),
          h: Math.round(cr.height),
          text: (card.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34),
        },
        ...worst,
      });
    }
  }
  return hits;
};

const findings = [];
const check = async (name) => {
  await page.screenshot({ path: path.join(OUT, `${SCHEME}-${name}.png`) });
  const hits = await page.evaluate(MEASURE, MIN);
  if (hits.length) {
    findings.push({ screen: name, hits });
    console.log(`\n  ${name}`);
    for (const h of hits) {
      console.log(
        `    ${String(h.gap).padStart(5)}px ${h.side.padEnd(5)} <${h.tag}> "${h.text}"  ` +
          `— in card "${h.card.text}"`,
      );
    }
  }
};

const go = async (href, name, wait = 2800) => {
  const l = page.locator(`a[href="${href}"]`).first();
  if ((await l.count()) === 0) return;
  await l.click().catch(() => {});
  await page.waitForTimeout(wait);
  await check(name);
};

const tap = async (label, name, wait = 3000) => {
  const target = page.getByText(label, { exact: false }).last();
  if ((await target.count()) === 0) return false;
  await target.click().catch(() => {});
  await page.waitForTimeout(wait);
  await check(name);
  return true;
};

const back = async () => {
  await page.getByRole('button', { name: /back/i }).first().click().catch(() => {});
  await page.waitForTimeout(2400);
};

console.log(`\n  card padding audit (${SCHEME}, anything closer than ${MIN}px)`);

await check('home');
await go('/discover', 'discover');
await go('/meetups', 'meetups');
await go('/opportunities', 'trials');
await go('/inbox', 'inbox');
await go('/profile', 'profile', 3400);
await tap('Talent Score', 'score', 3400);
await back();
/* /views is reached from the Home spotlight's own button, not from a tab. */
await go('/', 'home2', 2600);
if (!(await tap('See who', 'views', 3200))) {
  await tap('looked at your profile', 'views', 3200);
}
await back();
await go('/notifications', 'notifications');
await go('/challenges', 'challenges');
await go('/settings', 'settings');

console.log(
  findings.length === 0
    ? `\n  clean — nothing within ${MIN}px of a card edge\n`
    : `\n  ${findings.reduce((n, f) => n + f.hits.length, 0)} finding(s) on ${findings.length} screen(s)\n`,
);
fs.writeFileSync(path.join(OUT, `${SCHEME}-findings.json`), JSON.stringify(findings, null, 1));

await browser.close();
server.close();
