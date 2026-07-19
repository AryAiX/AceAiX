import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const REVIEW_EMAIL = process.env.MOBILE_E2E_EMAIL ?? 'athlete1@aryaix.com';
const REVIEW_PASSWORD = process.env.MOBILE_E2E_PASSWORD ?? '1234567!';

async function loginAsReviewer(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('athlete@example.com').fill(REVIEW_EMAIL);
  await page.getByPlaceholder('Your password').fill(REVIEW_PASSWORD);
  await page.getByText('Sign In', { exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15_000 });
}

const reviewRoutes: { path: string; expected: RegExp }[] = [
  { path: '/', expected: /Good |Dashboard|Welcome/i },
  { path: '/feed', expected: /Feed|Stories|post/i },
  { path: '/opportunities', expected: /Opportunities|For You/i },
  { path: '/profile', expected: /Rudy Fuller|Edit Profile/i },
  { path: '/performance', expected: /Performance/i },
  { path: '/analytics', expected: /Analytics|Scout Views/i },
  { path: '/events', expected: /Events|Create an Event/i },
  { path: '/medical', expected: /Medical|Clearance/i },
  { path: '/discover', expected: /Discover Athletes/i },
  { path: '/career', expected: /Career Timeline/i },
  { path: '/network', expected: /Network|Connections/i },
  { path: '/messages', expected: /Messages|Sergio Mendes/i },
  { path: '/settings', expected: /Settings|Account Deletion/i },
  { path: '/notifications', expected: /Notifications/i },
  { path: '/media', expected: /Media|Posts|Reels/i },
  { path: '/ai-coach', expected: /Career Planner/i },
  { path: '/public-profile', expected: /Public Profile|Rudy Fuller/i },
  { path: '/sportify-academy', expected: /Sportify|Academy/i },
  { path: '/sportify-talent', expected: /Sportify|Talent/i },
];

test.describe('App Store authenticated release gate', () => {
  test('review account loads every user-facing screen without a runtime error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await loginAsReviewer(page);

    for (const route of reviewRoutes) {
      await test.step(route.path, async () => {
        await page.goto(route.path);
        await expect(page).not.toHaveURL(/\/login$/);
        await expect(page.locator('body')).toContainText(route.expected, { timeout: 15_000 });
        await expect(page.locator('body')).not.toContainText(/Something went wrong|Unhandled Runtime Error/i);
      });
    }

    expect(pageErrors).toEqual([]);
  });

  test('reviewer can open a populated conversation and prepare a message', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/messages');

    await page.getByRole('button', { name: 'Open conversation with Sergio Mendes' }).click();
    await expect(page.getByText(/recent match footage/i)).toBeVisible();
    await expect(page.getByText(/trial schedule/i)).toBeVisible();

    const input = page.getByLabel('Message text');
    await input.fill('App Review chat draft verification');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    await input.fill('');

    await page.getByRole('button', { name: 'Back to conversations' }).click();
    await page.getByRole('button', { name: 'Start a new conversation' }).click();
    await expect(page.getByText('New Conversation', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Search AceAiX members')).toBeEditable();
    await page.getByRole('button', { name: 'Close new conversation' }).click();
  });

  test('reviewer can reach and edit every profile field', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/edit-profile');

    await expect(page.getByText('Edit Profile', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeEditable();
    await expect(page.getByLabel('Bio')).toBeEditable();
    await expect(page.getByLabel('Sport')).toBeEditable();
    await expect(page.getByLabel('Primary position')).toBeEditable();
    await expect(page.getByLabel('Current club')).toBeEditable();
    await expect(page.getByLabel('Phone number (optional)')).toBeEditable();
    await expect(page.getByRole('button', { name: 'Save profile changes' })).toBeVisible();
  });

  test('career coach accepts a question and returns personalized guidance', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/ai-coach');

    const question = page.getByLabel('Ask the career coach');
    await question.fill('How can I improve my profile?');
    await page.getByRole('button', { name: 'Send coach question' }).click();

    await expect(page.getByText(/Your profile is \d+% complete|Your profile is complete/i)).toBeVisible();
    await expect(page.getByText(/No data is sent to a third-party AI provider/i)).toBeVisible();
  });

  test('performance and medical records render production review data', async ({ page }) => {
    await loginAsReviewer(page);

    await page.goto('/performance');
    await expect(page.locator('body')).toContainText(/2025\/26|appearances|goals|assists/i);

    await page.goto('/medical');
    await expect(page.getByText(/cleared/i).first()).toBeVisible();
    await expect(page.getByText(/Pre-season fitness assessment/i)).toBeVisible();
    await expect(page.getByText(/Movement screening/i)).toBeVisible();
  });

  test('opportunity details and save state are interactive', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/opportunities');

    const details = page.getByRole('button', { name: /View .* opportunity details/i }).first();
    await expect(details).toBeVisible();
    await details.click();
    await expect(page.getByText(/About the opportunity|Requirements|Match analysis/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Close opportunity details' }).click();

    const save = page.getByRole('button', { name: /^Save opportunity /i }).first();
    if (await save.isVisible().catch(() => false)) {
      const label = await save.getAttribute('aria-label');
      await save.click();
      const unsaveLabel = label?.replace(/^Save /, 'Unsave ');
      if (unsaveLabel) {
        const unsave = page.getByRole('button', { name: unsaveLabel });
        await expect(unsave).toBeVisible();
        await unsave.click();
      }
    }
  });

  test('athlete can create and remove an event', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/events');
    const title = `Release QA ${Date.now()}`;

    await page.getByText('Create an Event', { exact: true }).click();
    await page.getByLabel('Event title').fill(title);
    await page.getByLabel('Event date').fill('2099-12-30');
    await page.getByLabel('Event time').fill('10:00 AM');
    await page.getByLabel('Event location').fill('AceAiX QA Venue');
    await page.getByRole('button', { name: 'Create event' }).click();
    await expect(page.getByText(title)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: `Delete event ${title}` }).click();
    await expect(page.getByText(title)).not.toBeVisible();
  });

  test('network message action opens the selected member conversation', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/network');

    const messageSergio = page.getByRole('button', { name: 'Message Sergio Mendes' });
    await expect(messageSergio).toBeVisible();
    await messageSergio.click();
    await expect(page.getByLabel('Message text')).toBeVisible();
    await expect(page.getByText(/recent match footage/i)).toBeVisible();
  });

  test('athlete can publish and remove a text post', async ({ page }) => {
    await loginAsReviewer(page);
    const caption = `Release QA post ${Date.now()}`;

    await page.goto('/media');
    await page.getByRole('button', { name: 'Create new post' }).click();
    await page.getByLabel('Post caption').fill(caption);
    await page.getByRole('button', { name: 'Publish post' }).click();
    await expect(page.getByLabel('Post caption')).not.toBeVisible();

    await page.goto('/feed');
    const postCaption = page.getByText(caption);
    await expect(postCaption).toBeVisible();
    const postCard = postCaption.locator('xpath=ancestor::div[.//*[@aria-label="Open post menu"]][1]');
    await postCard.getByRole('button', { name: 'Open post menu' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await postCard.getByRole('button', { name: 'Delete post' }).click();
    await expect(page.getByText(caption)).not.toBeVisible();
  });

test('athlete can publish, play, and remove a video reel', async ({ page }) => {
  await loginAsReviewer(page);
  await page.goto('/media');
  await page.getByText('Reels', { exact: true }).click();
  await page.getByRole('button', { name: 'Create new reel' }).click();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose reel video' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(path.join(process.cwd(), 'tests/fixtures/release-test-reel.mp4'));

  const caption = `Release reel ${Date.now()}`;
  await expect(page.getByText('Video', { exact: true })).toBeVisible();
  await page.getByLabel('Post caption').fill(caption);
  await page.getByRole('button', { name: 'Share reel' }).click();
  await expect(page.getByText(caption, { exact: true })).toBeVisible({ timeout: 20_000 });

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete reel' }).click();
  await expect(page.getByText(caption, { exact: true })).not.toBeVisible();
});

  test('global search routes to matching athlete profiles', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/');

    const search = page.getByLabel('Global search');
    await search.fill('Noura');
    await search.press('Enter');

    await expect(page).toHaveURL(/\/discover\?query=Noura/);
    await expect(page.getByText('Noura Saeed')).toBeVisible();
    await expect(page.getByText('SHABIR')).not.toBeVisible();
  });

test('athlete can add and remove a career milestone', async ({ page }) => {
  await loginAsReviewer(page);
  await page.goto('/career');

  const club = `Release Audit Club ${Date.now()}`;
  await page.getByRole('button', { name: 'Add career entry' }).click();
  await page.getByLabel('Career milestone type').fill('Signed');
  await page.getByLabel('Career club or event').fill(club);
  await page.getByLabel('Career milestone date').fill('2026-07-19');
  await page.getByLabel('Career entry notes').fill('Temporary release verification entry');
  await page.getByRole('button', { name: 'Save career entry' }).click();
  await expect(page.getByText(club, { exact: true })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: `Delete career entry ${club}` }).click();
  await expect(page.getByText(club, { exact: true })).not.toBeVisible();
});

  test('profile visibility preference persists and can be restored', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/settings');

    const visibility = page.getByRole('switch', { name: 'Profile visible to scouts' });
    await expect(visibility).toBeVisible();
    const originallyEnabled = await visibility.isChecked();
    await visibility.click();
    await expect(visibility).toBeChecked({ checked: !originallyEnabled });
    await expect(visibility).toBeEnabled();

    await page.reload();
    const persisted = page.getByRole('switch', { name: 'Profile visible to scouts' });
    await expect(persisted).toBeChecked({ checked: !originallyEnabled });
    await persisted.click();
    await expect(persisted).toBeChecked({ checked: originallyEnabled });
    await expect(persisted).toBeEnabled();
  });
});
