import { expect, test } from '@playwright/test';
import { login } from './helpers';

const ADMIN_ROUTES = [
  ['/admin/dashboard', /Platform Overview/i],
  ['/admin/users', /User Management/i],
  ['/admin/verification', /Verification Queue/i],
  ['/admin/sports', /Sports/i],
  ['/admin/leagues', /Competitions/i],
  ['/admin/competitions', /Competitions/i],
  ['/admin/content', /Content/i],
  ['/admin/ai', /AI Management/i],
  ['/admin/moderation', /Moderation/i],
  ['/admin/subscriptions', /Subscriptions/i],
  ['/admin/finance', /Finance/i],
  ['/admin/security', /Security & Compliance/i],
  ['/admin/system', /System Config/i],
  ['/admin/analytics', /Platform Analytics/i],
] as const;

test.describe('admin portal', () => {
  test('redirects misspelled /admim alias to canonical /admin', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/admim');
    await expect(page).toHaveURL(/\/admin(\/dashboard)?$/);
    await expect(page.locator('main')).toContainText(/Platform Overview/i);
  });

  test('loads every admin section from the navigation surface', async ({ page }) => {
    await login(page, 'admin');
    for (const [route, heading] of ADMIN_ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).toContainText(heading, { timeout: 15_000 });
      await expect(page.locator('main')).not.toContainText(/Mock data|u_demo/i);
    }
  });

  test('users page supports DB-backed search/filter controls', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/admin/users');
    await page.getByPlaceholder(/search users/i).fill('admin');
    await expect(page.locator('main')).toContainText(/users shown|No users found/i);
    await page.locator('select').selectOption('athlete');
    await expect(page.locator('main')).toContainText(/users shown|No users found/i);
  });
});
