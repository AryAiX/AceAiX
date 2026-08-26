import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('accessibility and access-control regressions', () => {
  test('login supports keyboard-only credential entry and submission', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /scout \/ coach \/ club/i }).click();
    await page.getByRole('button', { name: /^continue/i }).click();

    await page.getByLabel(/email address/i).fill('scout@aceaix.demo');
    await page.getByLabel(/email address/i).press('Tab');
    await expect(page.getByLabel(/^password$/i)).toBeFocused();
    await page.keyboard.type('demo123456');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 20_000 });
  });

  test('role guards reject cross-portal navigation', async ({ page }) => {
    await login(page, 'athlete');
    for (const route of ['/recruiter/search', '/partner/requests', '/admin/users']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/athlete\/dashboard$/);
    }
  });

  test('match dialog is named and closes with Escape', async ({ page }) => {
    await login(page, 'athlete');
    await page.goto('/athlete/performance');
    await page.getByRole('button', { name: /add match/i }).click();
    const dialog = page.getByRole('dialog', { name: /log match/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('athlete account menu links to the athlete profile id', async ({ page }) => {
    await login(page, 'athlete1');
    await page.getByRole('button', { name: /account menu/i }).click();
    const profileLink = page.getByRole('banner').getByRole('link', { name: /view public profile/i });
    await expect(profileLink).toHaveAttribute('href', /^\/athletes\/[0-9a-f-]{36}$/i);
    await profileLink.click();
    await expect(page).toHaveURL(/\/athletes\/[0-9a-f-]{36}$/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Rudy Fuller/i);
  });

  test('opportunity saves persist across reloads', async ({ page }) => {
    await login(page, 'athlete');
    await page.goto('/athlete/opportunities');

    const saveButton = page.getByRole('button', { name: /^(save|saved)$/i }).first();
    const wasSaved = (await saveButton.textContent())?.trim() === 'Saved';
    await saveButton.click();
    await expect(saveButton).toHaveText(wasSaved ? 'Save' : 'Saved');

    await page.reload();
    const persistedButton = page.getByRole('button', { name: /^(save|saved)$/i }).first();
    await expect(persistedButton).toHaveText(wasSaved ? 'Save' : 'Saved');

    await persistedButton.click();
    await expect(persistedButton).toHaveText(wasSaved ? 'Saved' : 'Save');
  });
});

test('public, scout, and admin views resolve the same athlete identity', async ({ browser }) => {
  test.setTimeout(90_000);
  const publicContext = await browser.newContext();
  const scoutContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  const scoutPage = await scoutContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    await publicPage.goto('/athletes');
    const href = await publicPage.locator('a[href^="/athletes/"]').first().getAttribute('href');
    expect(href).toMatch(/^\/athletes\/[0-9a-f-]{36}$/i);
    await publicPage.goto(href!);
    const athleteName = (await publicPage.getByRole('heading', { level: 1 }).textContent())?.trim();
    expect(athleteName).toBeTruthy();

    await login(scoutPage, 'scout');
    await scoutPage.goto(href!);
    await expect(scoutPage.getByRole('heading', { level: 1 })).toHaveText(athleteName!);

    await login(adminPage, 'admin');
    await adminPage.goto('/admin/users');
    await adminPage.getByPlaceholder(/search users/i).fill(athleteName!);
    await expect(adminPage.locator('main')).toContainText(athleteName!);
  } finally {
    await Promise.all([publicContext.close(), scoutContext.close(), adminContext.close()]);
  }
});

test('anonymous users can interact with public feed posts', async ({ page }) => {
  await page.goto('/feed');
  const share = page.getByRole('button', { name: /^share$/i }).first();
  await expect(share).toBeVisible({ timeout: 15_000 });
  await share.click();
  await expect(page.getByRole('button', { name: /copied/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /comment/i }).first()).toBeDisabled();
});
