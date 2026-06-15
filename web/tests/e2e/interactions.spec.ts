import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('critical button interactions', () => {
  test('fresh athlete signup creates a session and lands on the dashboard', async ({ page }) => {
    const stamp = Date.now();
    const fullName = `Signup Athlete ${stamp}`;
    const email = `signup-athlete-${stamp}@aryaix.com`;

    await page.goto('/auth/register');
    await page.getByRole('button', { name: /continue as athlete/i }).click({ force: true });
    await page.locator('input[placeholder="Your full name"]').fill(fullName);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('1234567!');
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL('**/athlete/dashboard', { timeout: 30_000 });
    await expect(page.locator('main')).toContainText(fullName);
    await expect(page.locator('main')).not.toContainText(/I'm joining as|Continue as Athlete|Create your account/);
  });

  test('generic athlete login does not show seeded athlete identity', async ({ page }) => {
    await login(page, 'athlete');
    await expect(page.locator('main')).toContainText(/Fresh Athlete/);
    await expect(page.locator('main')).not.toContainText(/Karim|Al-Hassan/);
  });

  test('Peter account login shows Peter profile, not stale demo profile', async ({ page }) => {
    await login(page, 'peter');
    await expect(page.locator('main')).toContainText(/Peter Schmeichel/);
    await expect(page.locator('main')).not.toContainText(/Fresh Athlete|Karim|Al-Hassan/);
  });

  test('athlete1 signup account logs in without returning to role selection', async ({ page }) => {
    await login(page, 'athlete1');
    await expect(page).toHaveURL(/\/athlete\/dashboard$/);
    await expect(page.locator('main')).toContainText(/Rudy Fuller/);
    await expect(page.locator('main')).not.toContainText(/I'm joining as|Continue as Athlete|Fresh Athlete|Karim|Al-Hassan/);
  });

  test('onboarding dashboard button routes non-athlete roles correctly', async ({ page }) => {
    const roles = [
      { role: 'scout' as const, expected: /\/recruiter\/dashboard$/ },
      { role: 'admin' as const, expected: /\/admin\/dashboard$/ },
      { role: 'medical' as const, expected: /\/partner\/dashboard$/ },
    ];

    for (const { role, expected } of roles) {
      await login(page, role);
      await page.goto('/auth/onboarding');
      await page.getByRole('button', { name: /go to dashboard/i }).click();
      await expect(page).toHaveURL(expected);
    }
  });

  test('public profile share buttons give visible feedback', async ({ page }) => {
    await page.goto('/athletes');
    const athleteLink = page.locator('a[href^="/athletes/"]').first();
    await expect(athleteLink).toBeVisible();
    const athleteHref = await athleteLink.getAttribute('href');
    expect(athleteHref).toBeTruthy();
    await page.goto(athleteHref!);
    await page.getByRole('button', { name: /^share$/i }).click();
    await expect(page.getByRole('button', { name: /copied/i }).first()).toBeVisible();

    await page.goto('/clubs');
    const clubLink = page.locator('a[href^="/clubs/"]').first();
    await expect(clubLink).toBeVisible();
    const clubHref = await clubLink.getAttribute('href');
    expect(clubHref).toBeTruthy();
    await page.goto(clubHref!);
    await page.getByRole('button', { name: /^share$/i }).click();
    await expect(page.getByRole('button', { name: /copied/i }).first()).toBeVisible();
  });

  test('feed action buttons are not silent no-ops', async ({ page }) => {
    await page.goto('/feed');
    await page.getByRole('button', { name: /^share$/i }).first().click();
    await expect(page.getByRole('button', { name: /copied/i }).first()).toBeVisible();

    const commentButtons = page.getByRole('button', { name: /comment/i });
    await expect(commentButtons.first()).toBeDisabled();
  });

  test('settings security placeholders are disabled instead of clickable no-ops', async ({ page }) => {
    await login(page, 'athlete');
    await page.goto('/athlete/settings');
    await page.getByRole('button', { name: /security/i }).click();
    await expect(page.getByRole('button', { name: /update password/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /delete account/i })).toBeDisabled();
  });
});
