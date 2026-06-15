import { test } from '@playwright/test';

test('debug athlete profile error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('/athletes', { waitUntil: 'networkidle' });
  const href = await page.locator('a[href^="/athletes/"]').first().getAttribute('href');
  console.log('PROFILE HREF:', href);
  await page.goto(href!, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const bodyText = (await page.locator('body').innerText()).slice(0, 200);
  console.log('BODY TEXT LEN:', bodyText.length, '::', bodyText.replace(/\n/g, ' '));
  console.log('ERRORS:\n' + (errors.join('\n') || '(none)'));
});
