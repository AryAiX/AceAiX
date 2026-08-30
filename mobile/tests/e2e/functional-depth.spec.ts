import { expect, test, type Browser, type Page } from '@playwright/test';

const PRIMARY = {
  email: process.env.MOBILE_E2E_EMAIL ?? 'athlete1@aryaix.com',
  password: process.env.MOBILE_E2E_PASSWORD ?? '1234567!',
};

const SECONDARY = {
  email: process.env.MOBILE_E2E_SECONDARY_EMAIL ?? 'athele1@aryaix.com',
  password: process.env.MOBILE_E2E_SECONDARY_PASSWORD ?? '1234567!',
};

async function clearSession(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function login(page: Page, account = PRIMARY) {
  await clearSession(page);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByText('Sign In', { exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 20_000 });
  await expect(page).not.toHaveURL(/\/athletes-only/, { timeout: 20_000 });
  await expect(page.locator('body')).toContainText(/Dashboard|Welcome|Good /i, {
    timeout: 20_000,
  });
}

function postCard(page: Page, caption: string) {
  return page
    .getByText(caption, { exact: true })
    .locator('xpath=ancestor::div[.//*[@aria-label="Open post menu"]][1]');
}

async function deleteOwnPost(page: Page, caption: string) {
  await page.goto('/feed');
  const captionNode = page.getByText(caption, { exact: true });
  if (!(await captionNode.isVisible().catch(() => false))) return;
  const card = postCard(page, caption);
  await card.getByRole('button', { name: 'Open post menu' }).click({ force: true });
  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: 'Delete post' }).click({ force: true });
  await expect(captionNode).not.toBeVisible();
}

test.describe.serial('deep mobile functional workflows', () => {
  test.setTimeout(120_000);

  test('profile edits persist through navigation and reload, then restore', async ({ page }) => {
    await login(page);

    async function openEditorThroughUi() {
      await page.goto('/settings');
      await page.getByText('Edit your personal and athlete information').click();
      await expect(page).toHaveURL(/\/edit-profile$/);
    }

    await openEditorThroughUi();

    const bio = page.getByLabel('Bio');
    const club = page.getByLabel('Current club');
    const originalBio = await bio.inputValue();
    const originalClub = await club.inputValue();
    const marker = `Functional QA ${Date.now()}`;

    async function saveAndAccept(expectNavigation = true) {
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Save profile changes' }).click();
      if (expectNavigation) {
        await expect(page).not.toHaveURL(/\/edit-profile$/, { timeout: 20_000 });
      }
    }

    try {
      await bio.fill(`${originalBio} ${marker}`.trim());
      await club.fill(marker);
      await saveAndAccept();
      await page.goto('/edit-profile');
      await expect(page.getByLabel('Bio')).toHaveValue(`${originalBio} ${marker}`.trim());
      await expect(page.getByLabel('Current club')).toHaveValue(marker);

      await page.reload();
      await expect(page.getByLabel('Bio')).toHaveValue(`${originalBio} ${marker}`.trim());
      await expect(page.getByLabel('Current club')).toHaveValue(marker);
    } finally {
      await openEditorThroughUi();
      await page.getByLabel('Bio').fill(originalBio);
      await page.getByLabel('Current club').fill(originalClub);
      // The first save above verifies user-facing back navigation. Cleanup only
      // needs to prove the original data was restored.
      await saveAndAccept(false);
      await page.goto('/edit-profile');
      await expect(page.getByLabel('Bio')).toHaveValue(originalBio);
      await expect(page.getByLabel('Current club')).toHaveValue(originalClub);
    }
  });

  test('event can be created, edited, reloaded, and deleted', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    const stamp = Date.now();
    const title = `Functional Event ${stamp}`;
    const editedTitle = `${title} Updated`;

    try {
      await page.getByText('Create an Event', { exact: true }).click();
      await page.getByLabel('Event title').fill(title);
      await page.getByLabel('Event date').fill('2099-11-23');
      await page.getByLabel('Event time').fill('6:45 PM');
      await page.getByLabel('Event location').fill('Functional QA Arena');
      await page.getByLabel('Event description').fill('Created through a multi-step UI test');
      await page.getByRole('button', { name: 'Create event' }).click();
      await expect(page.getByText(title, { exact: true })).toBeVisible();

      await page.getByRole('button', { name: `Edit event ${title}` }).click();
      await expect(page.getByText('Edit Event', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Event location')).toHaveValue('Functional QA Arena');
      await page.getByLabel('Event title').fill(editedTitle);
      await page.getByLabel('Event location').fill('Updated QA Arena');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText(editedTitle, { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText(editedTitle, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Edit event ${editedTitle}` }).click();
      await expect(page.getByLabel('Event location')).toHaveValue('Updated QA Arena');
      await page.getByRole('button', { name: 'Close event form' }).click();
    } finally {
      await page.goto('/events');
      const candidate = page.getByText(editedTitle, { exact: true });
      const fallback = page.getByText(title, { exact: true });
      const finalTitle = await candidate.isVisible().catch(() => false) ? editedTitle : title;
      if (await fallback.or(candidate).first().isVisible().catch(() => false)) {
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: `Delete event ${finalTitle}` }).click();
        await expect(page.getByText(finalTitle, { exact: true })).not.toBeVisible();
      }
    }
  });

  test('second athlete can discover, engage with, and comment on a new post', async ({ browser }) => {
    test.setTimeout(120_000);
    const caption = `Functional social ${Date.now()}`;
    const comment = `Second-user reply ${Date.now()}`;
    const primaryContext = await browser.newContext();
    const secondaryContext = await browser.newContext();
    const primary = await primaryContext.newPage();
    const secondary = await secondaryContext.newPage();

    try {
      await login(primary, PRIMARY);
      await primary.goto('/media');
      await primary.getByRole('button', { name: 'Create new post' }).click();
      await primary.getByLabel('Post caption').fill(caption);
      await primary.getByText('Followers', { exact: true }).click();
      await primary.getByText('Public', { exact: true }).click();
      await primary.getByRole('button', { name: 'Publish post' }).click();
      await expect(primary.getByLabel('Post caption')).not.toBeVisible({ timeout: 20_000 });

      await login(secondary, SECONDARY);
      await secondary.goto('/feed');
      // "For You" is sport-personalized; Latest is the cross-sport discovery
      // surface where another athlete's new public post must appear.
      await secondary.getByRole('button', { name: 'Show Latest posts' }).click();
      await expect(secondary.getByText(caption, { exact: true })).toBeVisible({ timeout: 20_000 });
      const secondaryCard = postCard(secondary, caption);

      await secondaryCard.getByRole('button', { name: 'Like post' }).click();
      await expect(secondaryCard.getByRole('button', { name: 'Unlike post' })).toBeVisible();
      await secondaryCard.getByRole('button', { name: 'Save post' }).click();
      await expect(secondaryCard.getByRole('button', { name: 'Remove saved post' })).toBeVisible();

      await secondaryCard.getByRole('button', { name: 'View comments' }).click();
      await secondary.getByLabel('Comment text').fill(comment);
      await secondary.getByRole('button', { name: 'Post comment' }).click();
      await expect(secondary.getByText(comment, { exact: true })).toBeVisible();
      await secondary.getByRole('button', { name: 'Close comments' }).click();

      await secondary.reload();
      const reloadedCard = postCard(secondary, caption);
      await expect(reloadedCard.getByRole('button', { name: 'Unlike post' })).toBeVisible();
      await expect(reloadedCard.getByRole('button', { name: 'Remove saved post' })).toBeVisible();
      await reloadedCard.getByRole('button', { name: 'View comments' }).click();
      await expect(secondary.getByText(comment, { exact: true })).toBeVisible();
      await secondary.getByRole('button', { name: 'Close comments' }).click();

      await primary.goto('/feed');
      const primaryCard = postCard(primary, caption);
      await primaryCard.getByRole('button', { name: 'View comments' }).click();
      await expect(primary.getByText(comment, { exact: true })).toBeVisible();
      await primary.getByRole('button', { name: 'Close comments' }).click();

      await secondaryCard.getByRole('button', { name: 'Unlike post' }).click().catch(() => {});
      await secondaryCard.getByRole('button', { name: 'Remove saved post' }).click().catch(() => {});
    } finally {
      await deleteOwnPost(primary, caption).catch(() => {});
      await Promise.all([primaryContext.close(), secondaryContext.close()]);
    }
  });
});
