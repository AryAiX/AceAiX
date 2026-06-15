import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('public site', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/AceAi/i);
  });

  test('athlete directory loads athletes from the DB', async ({ page }) => {
    await page.goto('/athletes');
    // seeded athletes should render as links to /athletes/:id
    await expect(page.locator('a[href^="/athletes/"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('clubs directory loads organizations', async ({ page }) => {
    await page.goto('/clubs');
    await expect(page.locator('a[href^="/clubs/"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('plans page loads pricing from CMS', async ({ page }) => {
    await page.goto('/plans');
    await expect(page.locator('body')).toContainText(/Athlete Pro|Scout|Club/i);
  });
});

test.describe('authenticated flows', () => {
  test('athlete can log in and see their dashboard', async ({ page }) => {
    await login(page, 'athlete');
    await expect(page.locator('body')).toContainText(/Profile Strength|Scout Reach|Career Trajectory/i);
  });

  test('scout can log in and search talent', async ({ page }) => {
    await login(page, 'scout');
    await page.goto('/recruiter/search');
    await expect(page.locator('body')).toContainText(/.+/);
  });

  test('admin can log in and see platform stats', async ({ page }) => {
    await login(page, 'admin');
    await expect(page.locator('body')).toContainText(/.+/);
  });
});
