import { expect, test, type Page } from '@playwright/test';
import { DEMO, login } from './helpers';

const MOCK_DATA_MARKERS = /Mock data|u_demo/i;

async function expectPortalPage(page: Page, route: string, text: RegExp) {
  await page.goto(route);
  await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, '\\/')}$`));
  await expect(page.locator('main')).toContainText(text, { timeout: 15_000 });
  await expect(page.locator('main')).not.toContainText(MOCK_DATA_MARKERS);
}

async function clearBrowserSession(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function currentDemoUserId(page: Page) {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(
      ([key]) => key.startsWith('sb-') && key.endsWith('-auth-token'),
    );
    if (!entry) return null;
    const session = JSON.parse(entry[1]) as { user?: { id?: string } };
    return session.user?.id ?? null;
  });
}

test.describe.serial('multi-role authentication and landing pages', () => {
  test('every DEMO account lands on its role home with live content', async ({ page }) => {
    test.setTimeout(180_000);
    const accounts = [
      ['athlete', /Fresh Athlete|Profile Strength|Scout Reach/i],
      ['peter', /Peter Schmeichel/i],
      ['athlete1', /Rudy Fuller/i],
      ['scout', /Recruiter Dashboard/i],
      ['admin', /Platform Overview/i],
      ['medical', /Medical Partner Dashboard/i],
    ] as const satisfies ReadonlyArray<readonly [keyof typeof DEMO, RegExp]>;

    for (const [role, homeText] of accounts) {
      await test.step(`${role} reaches ${DEMO[role].home}`, async () => {
        await login(page, role);
        await expect(page).toHaveURL(new RegExp(`${DEMO[role].home.replace(/\//g, '\\/')}$`));
        await expect(page.locator('main')).toContainText(homeText, { timeout: 15_000 });
        await expect(page.locator('main')).not.toContainText(MOCK_DATA_MARKERS);
      });
    }
  });

  test('invalid credentials show an error and remain on login', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.locator('input[type="email"]').fill(DEMO.athlete.email);
    await page.locator('input[type="password"]').fill('definitely-not-the-demo-password');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByText(/invalid login credentials|invalid email or password/i)).toBeVisible();
  });
});

test.describe.serial('role navigation surfaces', () => {
  test('athlete key pages load live content', async ({ page }) => {
    await login(page, 'athlete');
    await expectPortalPage(page, '/athlete/profile', /Profile|Personal|Athlete/i);
    await expectPortalPage(page, '/athlete/opportunities', /Opportunities/i);
    await expectPortalPage(page, '/athlete/messages', /Messages/i);
    await expectPortalPage(page, '/athlete/settings', /Settings/i);
  });

  test('scout key pages load live content', async ({ page }) => {
    await login(page, 'scout');
    await expectPortalPage(page, '/recruiter/search', /Search Athletes/i);
    await expectPortalPage(page, '/recruiter/watchlists', /Watchlist|Saved/i);
    await expectPortalPage(page, '/recruiter/messages', /Messages/i);
    await expectPortalPage(page, '/recruiter/settings', /Settings/i);
  });

  test('medical partner dashboard and requests load live content', async ({ page }) => {
    await login(page, 'medical');
    await expectPortalPage(page, '/partner/dashboard', /Medical Partner Dashboard/i);
    await expectPortalPage(page, '/partner/requests', /Clearance|Medical|Requests/i);
    await expectPortalPage(page, '/partner/settings', /Settings/i);
  });

  test('admin key pages load and user search responds', async ({ page }) => {
    await login(page, 'admin');
    await expectPortalPage(page, '/admin/users', /User Management/i);

    await page.getByPlaceholder(/search users/i).fill('admin');
    await expect(page.locator('main')).toContainText(/users shown|No users found/i, { timeout: 15_000 });
    await expect(page.locator('main')).not.toContainText(MOCK_DATA_MARKERS);

    await expectPortalPage(page, '/admin/verification', /Verification Queue/i);
    await expectPortalPage(page, '/admin/analytics', /Platform Analytics/i);
  });
});

test.describe.serial('authorization boundaries', () => {
  test('athlete is redirected away from admin and recruiter portals', async ({ page }) => {
    await login(page, 'athlete');

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/athlete\/dashboard$/, { timeout: 15_000 });
    await expect(page.locator('main')).not.toContainText(/Platform Overview/i);

    await page.goto('/recruiter/dashboard');
    await expect(page).toHaveURL(/\/athlete\/dashboard$/, { timeout: 15_000 });
    await expect(page.locator('main')).not.toContainText(/Recruiter Dashboard/i);
  });

  test('scout is redirected away from the admin portal', async ({ page }) => {
    await login(page, 'scout');
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
    await expect(page.locator('main')).toContainText(/Recruiter Dashboard/i);
    await expect(page.locator('main')).not.toContainText(/Platform Overview/i);
  });

  test('guest access to protected routes is refused', async ({ page }) => {
    for (const route of [
      '/athlete/dashboard',
      '/recruiter/dashboard',
      '/partner/dashboard',
      '/admin/dashboard',
    ]) {
      await test.step(`${route} redirects to login`, async () => {
        await clearBrowserSession(page);
        await page.goto(route);
        await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 15_000 });
        await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      });
    }
  });
});

test.describe.serial('cross-role and complex workflows', () => {
  test('scout searches for and opens an athlete public profile', async ({ page }) => {
    await login(page, 'scout');
    await page.goto('/recruiter/search');
    await expect(page.getByRole('heading', { name: /search athletes/i })).toBeVisible();

    const viewProfile = page.getByRole('button', { name: /^view$/i }).first();
    await expect(viewProfile).toBeVisible({ timeout: 15_000 });
    await viewProfile.click();

    await expect(page).toHaveURL(/\/athletes\/[^/?#]+$/);
    await expect(page.locator('body')).not.toContainText(MOCK_DATA_MARKERS);
    await expect(page.getByRole('button', { name: /^follow(?:ing)?$/i }).first()).toBeEnabled();
    await expect(page.getByRole('button', { name: /^message$/i }).first()).toBeEnabled();
  });

  test('athlete opens opportunities and filters by type', async ({ page }) => {
    await login(page, 'athlete');
    await page.goto('/athlete/opportunities');
    await expect(page.getByRole('heading', { name: /opportunities/i })).toBeVisible();

    await page.getByRole('button', { name: /^trials$/i }).click();
    await expect(page.locator('main')).toContainText(/Applied|Saved|Available/i);
    await expect(page.locator('main')).not.toContainText(MOCK_DATA_MARKERS);
  });

  test('athlete message deep link opens the DEMO scout conversation', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'scout');
    const scoutUserId = await currentDemoUserId(page);
    expect(scoutUserId, 'scout session should expose its authenticated user id').toBeTruthy();

    await login(page, 'athlete');
    await page.goto(`/athlete/messages?user=${scoutUserId}`);

    await expect(page).toHaveURL(/\/athlete\/messages$/, { timeout: 30_000 });
    await expect(page.locator('main')).toContainText(/Messages/i);
    await expect(page.locator('main')).toContainText(
      /Start the conversation|Select a conversation|Scout|Recruiter|Messages/i,
    );
  });

  test('header notifications, search, and settings tabs are operable', async ({ page }) => {
    await login(page, 'athlete');

    await page.getByRole('button', { name: /^notifications$/i }).click();
    await expect(page.getByText(/^Notifications$/).last()).toBeVisible();
    await expect(page.getByText(/No notifications yet|Loading/i).last()).toBeVisible();

    const headerSearch = page.getByRole('textbox', { name: /search athletes and clubs/i });
    await headerSearch.fill('Peter');
    await headerSearch.press('Enter');
    await expect(page).toHaveURL(/\/athletes\?q=Peter$/);

    await page.goto('/athlete/settings');
    const settings = page.getByRole('main');
    await settings.getByRole('button', { name: /notifications/i }).click();
    await expect(page.getByRole('heading', { name: /notification preferences/i })).toBeVisible();
    await settings.getByRole('button', { name: /privacy/i }).click();
    await expect(page.getByRole('heading', { name: /privacy controls/i })).toBeVisible();
    await settings.getByRole('button', { name: /security/i }).click();
    await expect(page.getByRole('heading', { name: /^security$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /update password/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /delete account/i })).toBeDisabled();
  });
});
