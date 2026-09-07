import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('password recovery routes are reachable without a session', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.getByRole('button', { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/auth\/forgot-password$/);
  await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();

  await page.goto('/auth/reset-password');
  await expect(page.getByRole('heading', { name: /reset link expired/i })).toBeVisible();
});

test('performance sync explains a missing verified football identity', async ({ page }) => {
  await login(page, 'athlete1');
  await page.goto('/athlete/performance');
  await expect(page.getByRole('heading', { name: /connected football data/i })).toBeVisible();
  await expect(page.getByText(/verified API-Football player ID must be assigned/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sync now/i })).toBeDisabled();
});

test('match form rejects impossible ratings', async ({ page }) => {
  await login(page, 'athlete');
  await page.goto('/athlete/performance');
  await page.getByRole('button', { name: /add match/i }).click();
  await page.locator('input[type="number"]').last().fill('12');
  await page.getByRole('button', { name: /log match/i }).click();
  await expect(page.getByRole('alert')).toContainText(/rating must be 0–10/i);
});
