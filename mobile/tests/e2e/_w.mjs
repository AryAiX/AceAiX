// Scratch walkthrough of Game Intelligence against the local backend. Not committed.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const SHOTS = process.env.SHOTS;
const PORT = 8812;
const who = process.env.WHO ?? 'omar.demo@aceaix.com';
const tag = process.env.TAG ?? 'omar';
const scheme = process.env.SCHEME ?? 'light';

const server = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
  const ext = path.extname(p);
  const type = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' }[ext] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${tag}-${n}.png`) });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
await page.getByRole('button').last().click().catch(() => {});
await page.waitForTimeout(2000);
if ((await page.locator('input').count()) < 2) {
  const buttons = page.getByRole('button');
  for (let i = (await buttons.count()) - 1; i >= 0; i -= 1) {
    await buttons.nth(i).click().catch(() => {});
    await page.waitForTimeout(900);
    if ((await page.locator('input').count()) >= 2) break;
  }
}
await page.locator('input').nth(0).fill(who);
await page.locator('input').nth(1).fill('AceAiX-Demo-2026');
await page.getByRole('button').last().click();
await page.waitForTimeout(4500);
for (let i = 0; i < 4; i += 1) {
  if ((await page.getByTestId('celebration-overlay').count()) === 0) break;
  await page.getByRole('button').last().click().catch(() => {});
  await page.waitForTimeout(700);
}
const go = async (p, n, wait = 3000) => { await page.goto('http://localhost:' + PORT + p, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(wait); await shot(n); };
const routes = (process.env.ROUTES || '').split(',').filter(Boolean);
let k = 0;
for (const r of routes) { k += 1; await go(r, String(k)); }
if (process.env.SCROLL) { await page.mouse.wheel(0, 900); await page.waitForTimeout(800); await shot('scrolled'); }
console.log(JSON.stringify(errors.filter((e) => !/WebSocket|NotSupported/.test(e)).slice(0, 8), null, 1));
await browser.close(); server.close();
