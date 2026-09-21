#!/usr/bin/env node
/**
 * Multi-role browser acceptance checks against the configured backend.
 *
 * Run after a web export:
 *   npm run build:web
 *   node tests/e2e/multi-role-scenarios.mjs
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DIST = path.join(ROOT, 'dist');
const PORT = 8793;
const ORIGIN = `http://localhost:${PORT}`;
const PASSWORD = 'AceAiX-Demo-2026';

const ACCOUNTS = [
  { role: 'athlete', email: 'layla.demo@aceaix.com', name: 'Layla', recruiter: false },
  { role: 'coach', email: 'marco.demo@aceaix.com', name: 'Marco', recruiter: true },
  { role: 'scout', email: 'nadia.demo@aceaix.com', name: 'Nadia', recruiter: true },
  { role: 'academy', email: 'academy.demo@aceaix.com', name: 'Academy', recruiter: true },
];
const requestedRole = process.argv.includes('--role')
  ? process.argv[process.argv.indexOf('--role') + 1]
  : null;
const rolesToRun = requestedRole
  ? ACCOUNTS.filter((account) => account.role === requestedRole)
  : ACCOUNTS;

function readEnv() {
  const result = { ...process.env };
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in result)) result[match[1]] = match[2].trim();
  }
  return result;
}

function serveExport() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/index.html is missing; run npm run build:web first');
  }
  const mime = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
  };
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = path.join(DIST, requestPath);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

const results = [];

async function check(label, operation) {
  try {
    const detail = await operation();
    results.push({ label, ok: true });
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const message = String(error?.message ?? error).split('\n')[0];
    results.push({ label, ok: false, message });
    console.log(`  FAIL ${label} — ${message}`);
  }
}

async function chooseEnglish(page) {
  await page.goto(`${ORIGIN}/sign-in`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  if ((await page.locator('body').innerText()).includes('Choose your language')) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForTimeout(500);
    await page.goto(`${ORIGIN}/sign-in`, { waitUntil: 'domcontentloaded' });
  }
}

async function signIn(page, account, password = PASSWORD) {
  await chooseEnglish(page);
  const fields = page.locator('input');
  await fields.nth(0).fill(account.email);
  await fields.nth(1).fill(password);
  await page.getByTestId('sign-in-submit').click();
}

async function visit(page, route, expected, minChars = 45) {
  await page.goto(`${ORIGIN}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  let text = (await page.locator('body').innerText()).trim();
  if (
    text.length < minChars ||
    text.includes('Welcome back') ||
    (expected && !text.toLowerCase().includes(expected.toLowerCase()))
  ) {
    await page.waitForTimeout(3000);
    text = (await page.locator('body').innerText()).trim();
  }
  if (text.length < minChars) throw new Error(`thin screen (${text.length} characters)`);
  if (text.includes('Welcome back')) throw new Error('was redirected to sign in');
  if (expected && !text.toLowerCase().includes(expected.toLowerCase())) {
    throw new Error(`expected "${expected}" in "${text.slice(0, 100).replace(/\n/g, ' | ')}"`);
  }
  return `${text.length} chars`;
}

async function firstOpportunityId(env) {
  if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) return null;
  const client = createClient(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error: signInError } = await client.auth.signInWithPassword({
    email: ACCOUNTS[0].email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  const { data, error } = await client
    .from('opportunities')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

const env = readEnv();
const server = await serveExport();
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);

try {
  console.log('\n  signed-out and invalid-auth checks');
  await check('private feed redirects signed-out visitor', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await chooseEnglish(page);
    await page.goto(`${ORIGIN}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/welcome/, { timeout: 8000 });
    await context.close();
    return 'welcome gate';
  });

  await check('wrong password is rejected without leaving sign-in', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS[0], 'definitely-wrong-password');
    await page.getByText('That email or password is not right.').first().waitFor({ timeout: 8000 });
    if (!page.url().includes('sign-in')) throw new Error(`unexpected URL ${page.url()}`);
    await context.close();
    return 'friendly credential error';
  });

  const opportunityId = await firstOpportunityId(env);

  for (const account of rolesToRun) {
    console.log(`\n  ${account.role}`);
    const context = await browser.newContext({
      viewport: { width: 414, height: 896 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    await check(`${account.role} can sign in`, async () => {
      await signIn(page, account);
      await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 10000 });
      await page.waitForTimeout(1200);
      const body = await page.locator('body').innerText();
      if (body.includes('Welcome back')) throw new Error('sign-in form remained visible');
      return account.email;
    });
    await check(`${account.role} feed renders`, () => visit(page, '/', 'Ace'));
    await check(`${account.role} profile renders`, () => visit(page, '/profile', account.name));
    await check(`${account.role} messages render`, () => visit(page, '/inbox', 'Messages', 30));
    await check(`${account.role} opportunities render`, () =>
      visit(page, '/opportunities', 'Opportunities'));

    if (account.recruiter) {
      await check(`${account.role} can open opportunity composer`, async () => {
        await page.goto(`${ORIGIN}/opportunity/new`, { waitUntil: 'domcontentloaded' });
        await page.getByTestId('new-opportunity-screen').waitFor({ timeout: 8000 });
        return 'posting form';
      });
      await check(`${account.role} can open challenge composer`, async () => {
        await page.goto(`${ORIGIN}/challenge/new`, { waitUntil: 'domcontentloaded' });
        await page.getByTestId('challenge-new-screen').waitFor({ timeout: 8000 });
        return 'verified recruiter form';
      });
    } else {
      await check('athlete cannot post opportunities', async () => {
        await page.goto(`${ORIGIN}/opportunity/new`, { waitUntil: 'domcontentloaded' });
        await page.getByText('Only coaches, clubs and scouts can post opportunities.').waitFor({
          timeout: 8000,
        });
        return 'role gate';
      });
      await check('athlete cannot create challenges', async () => {
        await page.goto(`${ORIGIN}/challenge/new`, { waitUntil: 'domcontentloaded' });
        await page.getByTestId('challenge-new-restricted').waitFor({ timeout: 8000 });
        return 'verification/role gate';
      });
      if (opportunityId) {
        await check('athlete cannot review applicants', () =>
          visit(page, `/opportunity/${opportunityId}/applicants`, 'can see who applied', 30));
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n  ${results.length - failed.length}/${results.length} multi-role checks passed\n`);
if (failed.length) process.exitCode = 1;
