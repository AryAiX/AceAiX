import { expect, test } from '@playwright/test';

/**
 * The mobile app is a separate codebase from the web app, so the web
 * accessibility and dismissal fixes had to be ported by hand. These tests hold
 * that port in place. On react-native-web `accessibilityLabel` renders as
 * `aria-label`, so Playwright's `getByLabel` sees the same accessible name a
 * screen reader would announce on a device.
 */
test.describe('mobile accessibility and dismissal parity', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('login fields and password toggle expose accessible names', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    const reveal = page.getByLabel('Show password');
    await expect(reveal).toBeVisible();
    await reveal.click();
    await expect(page.getByLabel('Hide password')).toBeVisible();
  });

  test('login accepts keyboard-only credential entry and submission', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('nobody@aceaix.invalid');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByLabel('Password', { exact: true }).press('Enter');

    // Enter must submit the form rather than doing nothing; a rejected sign-in
    // surfaces an error and keeps the user on the login screen.
    await expect(page.locator('body')).toContainText(/invalid|incorrect|credential|unable/i, {
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/login/);
  });

  test('password recovery is reachable and guarded without a session', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByLabel('Email')).toBeVisible();

    // Reset must stay reachable without a session (the auth guard used to bounce
    // it to /login) while still refusing to accept a new password without a
    // valid recovery link.
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/reset-password/);
    await expect(page.getByText('Link expired')).toBeVisible();
    await expect(page.getByText('Request a new link')).toBeVisible();
  });

  test('signup fields expose accessible names', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Phone number')).toBeVisible();
    await expect(page.getByLabel('Cancel signup')).toBeVisible();
  });

  test('signup picker opens and closes through its labelled control', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/^Country calling code/).click();
    await expect(page.getByLabel('Search Country Code')).toBeVisible();

    await page.getByLabel('Close Country Code picker').click();
    await expect(page.getByLabel('Search Country Code')).toBeHidden();
  });

  test('auth screens load without uncaught runtime errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    for (const route of ['/login', '/signup', '/forgot-password', '/reset-password']) {
      await page.goto(route);
      await expect(page.locator('body')).not.toContainText(
        /Something went wrong|Unhandled Runtime Error/i,
      );
    }

    expect(pageErrors).toEqual([]);
  });
});
