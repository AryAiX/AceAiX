#!/usr/bin/env node
/**
 * Canonical Expo-web smoke for V2 public and authentication routes.
 * It needs only an exported dist/ directory; no V1 fixtures or backend.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../../dist');
const PORT = Number(process.env.SMOKE_PORT ?? 8796);

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('dist/index.html is missing; run npm run build:web first');
}

const mime = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  let file = path.join(DIST, pathname);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`http://127.0.0.1:${PORT}/sign-in`);
  await page.waitForTimeout(1_200);
  const languageGate = page.getByText('Choose your language');
  if (await languageGate.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(800);
  }

  const checks = [
    { path: '/', id: 'welcome-sign-in' },
    { path: '/sign-in', id: 'sign-in-submit' },
    { path: '/forgot-password', id: 'forgot-password-submit' },
    { path: '/reset-password', id: 'reset-password-screen' },
    { path: '/legal/privacy', text: 'Privacy' },
  ];

  for (const check of checks) {
    await page.goto(`http://127.0.0.1:${PORT}${check.path}`);
    const locator = check.id ? page.getByTestId(check.id) : page.getByText(check.text, { exact: false });
    try {
      await locator.first().waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 240);
      throw new Error(`${check.path} did not render ${check.id ?? check.text}; body: ${body}`);
    }
    console.log(`✓ ${check.path}`);
  }

  if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
