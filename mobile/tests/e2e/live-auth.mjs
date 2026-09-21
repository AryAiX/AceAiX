#!/usr/bin/env node
/**
 * Live sign-up → confirmation → sign-in journey.
 *
 * This intentionally creates a temporary account in the linked development
 * project, confirms it as an administrator (there is no inbox in CI), proves
 * the browser reaches onboarding, and deletes the account in `finally`.
 *
 * Required:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.LIVE_AUTH_PORT ?? 8797);
const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !ANON_KEY || !SERVICE_KEY) {
  throw new Error('Live auth requires the Supabase URL, anon key, and service-role key');
}
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('dist/index.html is missing; build the web export first');
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

const admin = createClient(URL_, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const email = `browser.auth.${Date.now()}@example.com`;
const password = 'Live-Auth-2026!';
let userId = null;

try {
  await page.goto(`http://127.0.0.1:${PORT}/sign-in`);
  await page.waitForTimeout(1200);
  const languageGate = page.getByText('Choose your language');
  if (await languageGate.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(1000);
  }

  await page.goto(`http://127.0.0.1:${PORT}/sign-up`);
  await page.getByTestId('signup-role-athlete').click();
  await page.getByTestId('signup-continue').click();
  await page.getByTestId('signup-first-name').fill('Browser');
  await page.getByTestId('signup-last-name').fill('Auth');
  await page.getByTestId('signup-continue').click();
  await page.getByTestId('signup-dob-day').pressSequentially('10');
  await page.getByTestId('signup-dob-month').pressSequentially('05');
  await page.getByTestId('signup-dob-year').pressSequentially('2000');
  await page.getByTestId('signup-continue').click();
  await page.getByTestId('signup-email').fill(email);
  await page.getByTestId('signup-password').fill(password);
  // Click the drawn square, not a Terms/Privacy link nested in the label.
  await page.getByRole('checkbox').click({ position: { x: 13, y: 22 } });
  if (!(await page.getByTestId('signup-continue').isEnabled())) {
    throw new Error('Accepting the terms did not enable account creation');
  }
  await page.getByTestId('signup-continue').click();
  try {
    await page.getByText('Check your email').waitFor({ state: 'visible', timeout: 20_000 });
  } catch (error) {
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500);
    throw new Error(`Sign-up did not reach confirmation. Page said: ${body}`, { cause: error });
  }
  console.log('✓ browser sign-up created an unconfirmed account');

  const { data: users, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const created = users.users.find((user) => user.email === email);
  if (!created) throw new Error('Signed-up user was not found through the admin API');
  userId = created.id;

  const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (confirmError) throw confirmError;

  await page.goto(`http://127.0.0.1:${PORT}/sign-in`);
  await page.getByTestId('sign-in-email').fill(email);
  await page.getByTestId('sign-in-password').fill(password);
  await page.getByTestId('sign-in-submit').click();
  await page.getByTestId('onboarding-screen').waitFor({ state: 'visible', timeout: 20_000 });
  console.log('✓ confirmed browser account signed in and reached onboarding');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    console.log('✓ temporary auth account deleted');
  }
}
