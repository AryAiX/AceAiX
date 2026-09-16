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
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];
  const checks = [
    { path: '/', id: 'welcome-sign-in' },
    { path: '/welcome', id: 'welcome-sign-in' },
    { path: '/sign-in', id: 'sign-in-submit' },
    { path: '/forgot-password', id: 'forgot-password-submit' },
    { path: '/reset-password', id: 'reset-password-screen' },
    { path: '/check-email', text: 'Check your email' },
    { path: '/legal/terms', text: 'Terms of Service' },
    { path: '/legal/privacy', text: 'Privacy' },
    { path: '/legal/guidelines', text: 'Community Guidelines' },
    { path: '/legal/child-safety', text: 'Child Safety' },
    { path: '/not-a-real-route', text: 'This page has moved on' },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`http://127.0.0.1:${PORT}/sign-in`);
    await page.waitForTimeout(800);
    const languageGate = page.getByText('Choose your language');
    if (await languageGate.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForTimeout(500);
    }

    for (const check of checks) {
      await page.goto(`http://127.0.0.1:${PORT}${check.path}`);
      const locator = check.id
        ? page.getByTestId(check.id)
        : page.getByText(check.text, { exact: false });
      try {
        await locator.first().waitFor({ state: 'visible', timeout: 10_000 });
      } catch {
        const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 240);
        throw new Error(
          `${viewport.name} ${check.path} did not render ${check.id ?? check.text}; body: ${body}`,
        );
      }
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflows) throw new Error(`${viewport.name} ${check.path} overflows horizontally`);
      console.log(`✓ ${viewport.name} ${check.path}`);
    }

    await page.goto(`http://127.0.0.1:${PORT}/sign-in`);
    await page.getByTestId('sign-in-submit').click();
    const email = page.getByTestId('sign-in-email');
    const errorId = await email.getAttribute('aria-describedby');
    if (
      (await email.getAttribute('aria-invalid')) !== 'true' ||
      !errorId ||
      !(await page.evaluate((id) => Boolean(document.getElementById(id)), errorId))
    ) {
      throw new Error(`${viewport.name} sign-in error is not associated with its field`);
    }
    console.log(`✓ ${viewport.name} form error accessibility`);

    // The date adapter must be a real browser date input under the same
    // single-field UI as native. React Native Web silently strips `type=date`
    // from TextInput, so this interaction protects against that regression.
    await page.goto(`http://127.0.0.1:${PORT}/sign-up`);
    await page.getByRole('radio', { name: /I'm an athlete/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'First name' }).fill('Browser');
    await page.getByRole('textbox', { name: 'Last name' }).fill('Smoke');
    await page.getByRole('button', { name: 'Continue' }).click();
    const dob = page.getByTestId('signup-dob-field');
    if ((await dob.getAttribute('type')) !== 'date') {
      throw new Error(`${viewport.name} DOB control is not a browser date input`);
    }
    await dob.fill('2010-09-04');
    if (!(await page.getByRole('button', { name: 'Continue' }).isEnabled())) {
      throw new Error(`${viewport.name} valid DOB did not enable Continue`);
    }
    console.log(`✓ ${viewport.name} date adapter`);

    if (errors.length) throw new Error(`${viewport.name} page errors: ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
