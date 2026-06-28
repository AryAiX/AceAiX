import { expect, test } from '@playwright/test';

const protectedRoutes = [
  '/',
  '/profile',
  '/feed',
  '/media',
  '/opportunities',
  '/performance',
  '/analytics',
  '/events',
  '/medical',
  '/discover',
  '/career',
  '/network',
  '/messages',
  '/settings',
  '/notifications',
  '/ai-coach',
  '/public-profile',
  '/sportify-academy',
  '/sportify-talent',
  '/unknown-route',
  '/profile?tab=overview',
  '/profile?tab=performance',
  '/profile?tab=career',
  '/profile?tab=network',
  '/opportunities?tab=for-you',
  '/opportunities?tab=all',
  '/opportunities?tab=saved',
  '/opportunities?tab=applications',
  '/feed?type=posts',
  '/feed?type=reels',
  '/events?create=1',
  '/notifications?filter=all',
  '/notifications?filter=unread',
  '/settings?section=notifications',
  '/settings?section=integrations',
  '/analytics?range=month',
  '/analytics?range=year',
  '/discover?sport=Football',
  '/discover?sport=Basketball',
  '/network?filter=Scouts',
  '/network?filter=Coaches',
  '/messages?query=scout',
  '/medical?section=records',
  '/performance?sport=football',
  '/performance?sport=chess',
  '/public-profile?preview=1',
  '/sportify-academy?tab=results',
  '/sportify-academy?tab=appointments',
  '/sportify-talent?section=talent',
  '/athletes-only',
];

test.describe('AceAiX mobile major unauthenticated flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('login screen renders the athlete-only sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByText('Sign in to your athlete account')).toBeVisible();
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('login form exposes email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('athlete@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
  });

  test('signup screen renders required athlete onboarding fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('Create Account').first()).toBeVisible();
    await expect(page.getByPlaceholder('Your full name')).toBeVisible();
    await expect(page.getByPlaceholder('athlete@example.com')).toBeVisible();
    await expect(page.getByText('Sport', { exact: true })).toBeVisible();
  });

  test('login links to signup', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Create Account').click();
    await expect(page).toHaveURL(/signup/);
  });

  for (const route of protectedRoutes) {
    test(`protected route redirects to login: ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText('Welcome back')).toBeVisible();
      await expect(page.getByText('Sign in to your athlete account')).toBeVisible();
    });
  }
});
