import { Page, expect } from '@playwright/test';

export const DEMO = {
  athlete: { email: 'athlete@aceaix.demo', password: 'demo123456', home: '/athlete/dashboard' },
  peter: { email: 'athele1@aryaix.com', password: '1234567!', home: '/athlete/dashboard' },
  athlete1: { email: 'athlete1@aryaix.com', password: '1234567!', home: '/athlete/dashboard' },
  scout: { email: 'scout@aceaix.demo', password: 'demo123456', home: '/recruiter/dashboard' },
  admin: { email: 'admin@aceaix.demo', password: 'demo123456', home: '/admin/dashboard' },
  medical: { email: 'medical@aceaix.demo', password: 'demo123456', home: '/partner/dashboard' },
};

/** Log in via the credentials form and wait for the role's landing page. */
export async function login(page: Page, role: keyof typeof DEMO) {
  const creds = DEMO[role];
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('/auth/login');
  // Step 1: role selector → Continue
  const cont = page.getByRole('button', { name: /continue/i });
  if (await cont.isVisible().catch(() => false)) await cont.click({ force: true });
  // Step 2: fill credentials
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(`**${creds.home}`, { timeout: 20_000 });
  await expect(page).toHaveURL(new RegExp(creds.home.replace(/\//g, '\\/')));
}
