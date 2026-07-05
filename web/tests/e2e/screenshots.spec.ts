import { test } from '@playwright/test';
import { login } from './helpers';

const DIR = 'screenshots';

async function shoot(page: import('@playwright/test').Page, path: string, name: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(800);
  // Scroll through the page so IntersectionObserver scroll-reveal animations fire.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
}

test('capture public pages', async ({ page }) => {
  test.setTimeout(120_000);
  const routes: [string, string][] = [
    ['/', '01-home'],
    ['/discover', '02-discover'],
    ['/athletes', '03-athletes'],
    ['/clubs', '04-clubs'],
    ['/highlights', '05-highlights'],
    ['/feed', '06-feed'],
    ['/plans', '07-plans'],
    ['/resources', '08-resources'],
    ['/about', '09-about'],
    ['/auth/login', '10-login'],
    ['/auth/register', '11-register'],
  ];
  for (const [path, name] of routes) await shoot(page, path, `public-${name}`);

  // a real public athlete profile (first card on the directory)
  await page.goto('/athletes', { waitUntil: 'domcontentloaded' });
  await page.locator('a[href^="/athletes/"]').first().waitFor({ timeout: 8000 }).catch(() => {});
  const href = await page.locator('a[href^="/athletes/"]').first().getAttribute('href').catch(() => null);
  if (href) await shoot(page, href, 'public-12-athlete-profile');
  await page.goto('/clubs', { waitUntil: 'domcontentloaded' });
  await page.locator('a[href^="/clubs/"]').first().waitFor({ timeout: 8000 }).catch(() => {});
  const club = await page.locator('a[href^="/clubs/"]').first().getAttribute('href').catch(() => null);
  if (club) await shoot(page, club, 'public-13-club-profile');
});

test('capture athlete app', async ({ page }) => {
  await login(page, 'athlete');
  const routes: [string, string][] = [
    ['/athlete/dashboard', '01-dashboard'],
    ['/athlete/profile', '02-profile'],
    ['/athlete/media', '03-media'],
    ['/athlete/performance', '04-performance'],
    ['/athlete/medical', '05-medical'],
    ['/athlete/network', '06-network'],
    ['/athlete/career', '07-career'],
    ['/athlete/opportunities', '08-opportunities'],
    ['/athlete/ai', '09-ai'],
    ['/athlete/analytics', '10-analytics'],
    ['/athlete/messages', '11-messages'],
    ['/athlete/settings', '12-settings'],
  ];
  for (const [path, name] of routes) await shoot(page, path, `athlete-${name}`);
});

test('capture recruiter app', async ({ page }) => {
  await login(page, 'scout');
  const routes: [string, string][] = [
    ['/recruiter/dashboard', '01-dashboard'],
    ['/recruiter/search', '02-search'],
    ['/recruiter/watchlists', '03-watchlists'],
    ['/recruiter/analytics', '04-analytics'],
    ['/recruiter/messages', '05-messages'],
  ];
  for (const [path, name] of routes) await shoot(page, path, `recruiter-${name}`);
});

test('capture admin app', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, 'admin');
  const routes: [string, string][] = [
    ['/admin/dashboard', '01-dashboard'],
    ['/admin/users', '02-users'],
    ['/admin/verification', '03-verification'],
    ['/admin/sports', '04-sports'],
    ['/admin/leagues', '05-leagues'],
    ['/admin/competitions', '06-competitions'],
    ['/admin/content', '07-content'],
    ['/admin/ai', '08-ai'],
    ['/admin/moderation', '09-moderation'],
    ['/admin/subscriptions', '10-subscriptions'],
    ['/admin/finance', '11-finance'],
    ['/admin/security', '12-security'],
    ['/admin/system', '13-system'],
    ['/admin/analytics', '14-analytics'],
  ];
  for (const [path, name] of routes) await shoot(page, path, `admin-${name}`);
});

test('capture partner app', async ({ page }) => {
  await login(page, 'medical');
  const routes: [string, string][] = [
    ['/partner/dashboard', '01-dashboard'],
    ['/partner/requests', '02-requests'],
  ];
  for (const [path, name] of routes) await shoot(page, path, `partner-${name}`);
});
