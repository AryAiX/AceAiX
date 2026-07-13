import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('athlete can review explainable recommendations', async ({ page }) => {
  await login(page, 'athlete');
  await page.goto('/athlete/ai');

  await expect(page.getByRole('heading', { name: /next best moves/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText(
    /Opportunity matches|This week|Profile & visibility|Development priorities/i,
  );
  await expect(page.getByRole('link', { name: /Take action/i }).first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/athlete-09-ai.png', fullPage: true });
});
