import { expect, test, type Browser, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PRIMARY = {
  email: process.env.MOBILE_E2E_EMAIL ?? 'athlete1@aryaix.com',
  password: process.env.MOBILE_E2E_PASSWORD ?? '1234567!',
};

const SECONDARY = {
  // The seeded neutral athlete is reset to a known clean social graph. The
  // legacy athele1 account can contain blocks/follows from manual QA sessions.
  email: process.env.MOBILE_E2E_SECONDARY_EMAIL ?? 'athlete@aceaix.demo',
  password: process.env.MOBILE_E2E_SECONDARY_PASSWORD ?? 'demo123456',
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

function mobileEnv() {
  const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  return Object.fromEntries(
    env
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function deletePerformanceSeason(season: string) {
  const env = mobileEnv();
  const db = createClient(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error: authError } = await db.auth.signInWithPassword(PRIMARY);
  if (authError) throw authError;
  const { error } = await db
    .from('performance_records')
    .delete()
    .eq('athlete_id', data.user.id)
    .eq('season_or_period', season);
  if (error) throw error;
}

async function databaseFor(account: { email: string; password: string }) {
  const env = mobileEnv();
  const db = createClient(
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { error } = await db.auth.signInWithPassword(account);
  if (error) throw error;
  return db;
}

async function primaryDatabase() {
  return databaseFor(PRIMARY);
}

function postCard(page: Page, caption: string) {
  return page
    // The caption is nested beneath a bold author-name Text element, so React
    // Native Web exposes one combined text node rather than an exact caption.
    .getByText(caption)
    .locator('xpath=ancestor::div[.//*[@aria-label="Open post menu"]][1]');
}

async function cleanupFunctionalPosts(page: Page) {
  await page.goto('/feed');
  await page.getByRole('button', { name: 'Show Latest posts' }).click();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const caption = page.getByText(/Functional social \d+/).first();
    if (!(await caption.isVisible().catch(() => false))) return;
    const card = caption.locator('xpath=ancestor::div[.//*[@aria-label="Open post menu"]][1]');
    await card.getByRole('button', { name: 'Open post menu' }).click({ force: true });
    page.once('dialog', (dialog) => dialog.accept());
    await card.getByRole('button', { name: 'Delete post' }).click({ force: true });
    await expect(caption).not.toBeVisible();
  }
  throw new Error('More than ten stale Functional social posts require cleanup');
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

  test('event form rejects impossible calendar dates', async ({ page }) => {
    await login(page);
    await page.goto('/events');
    const title = `Invalid Date Event ${Date.now()}`;

    try {
      await page.getByText('Create an Event', { exact: true }).click();
      await page.getByLabel('Event title').fill(title);
      await page.getByLabel('Event date').fill('2026-02-31');
      await page.getByLabel('Event location').fill('Functional QA Arena');
      await page.getByRole('button', { name: 'Create event' }).click();
      await expect(page.getByText('Enter a valid calendar date.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create event' })).toBeVisible();
    } finally {
      await page.goto('/events');
      if (await page.getByText(title, { exact: true }).isVisible().catch(() => false)) {
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: `Delete event ${title}` }).click();
        await expect(page.getByText(title, { exact: true })).not.toBeVisible();
      }
    }
  });

  test('career milestone can be validated, created, edited, reloaded, and deleted', async ({ page }) => {
    await login(page);
    await page.goto('/career');
    const stamp = Date.now();
    const club = `Functional Career ${stamp}`;
    const editedClub = `${club} Updated`;

    try {
      await page.getByRole('button', { name: 'Add career entry' }).click();
      await page.getByRole('button', { name: 'Select milestone type Signed' }).click();
      await page.getByLabel('Career club or event').fill(club);
      await page.getByLabel('Career milestone date').fill('2026-02-31');
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Save career entry' }).click();
      await expect(
        page.getByRole('dialog').getByText('Add Career Entry', { exact: true }),
      ).toBeVisible();

      await page.getByLabel('Career milestone date').fill('2026-02-28');
      await page.getByLabel('Career entry notes').fill('Created by functional UI audit');
      await page.getByRole('button', { name: 'Save career entry' }).click();
      await expect(page.getByText(club, { exact: true })).toBeVisible();

      await page.getByRole('button', { name: `Edit career entry ${club}` }).click();
      await expect(page.getByText('Edit Career Entry', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Career entry notes')).toHaveValue('Created by functional UI audit');
      await page.getByLabel('Career club or event').fill(editedClub);
      await page.getByLabel('Career entry notes').fill('Updated by functional UI audit');
      await page.getByRole('button', { name: 'Save career entry' }).click();
      await expect(page.getByText(editedClub, { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByText(editedClub, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Edit career entry ${editedClub}` }).click();
      await expect(page.getByLabel('Career entry notes')).toHaveValue('Updated by functional UI audit');
      await page.getByRole('button', { name: 'Close career entry' }).click();
    } finally {
      await page.goto('/career');
      const updated = page.getByText(editedClub, { exact: true });
      const original = page.getByText(club, { exact: true });
      const finalClub = await updated.isVisible().catch(() => false) ? editedClub : club;
      if (await updated.or(original).first().isVisible().catch(() => false)) {
        page.once('dialog', (dialog) => dialog.accept());
        await page.getByRole('button', { name: `Delete career entry ${finalClub}` }).click();
        await expect(page.getByText(finalClub, { exact: true })).not.toBeVisible();
      }
    }
  });

  test('editing performance stats preserves the current record values', async ({ page }) => {
    await login(page);
    await page.goto('/performance');
    const season = `FUNCTIONAL-${Date.now()}`;
    const edit = page.getByText('Edit Stats', { exact: true });
    await expect(edit).toBeVisible();
    try {
      await edit.click();
      // Existing values must be present rather than a blank destructive form.
      await expect(page.getByLabel('Season or period')).not.toHaveValue('');
      await page.getByLabel('Season or period').fill(season);
      await page.getByLabel('Goals').fill('13');
      await page.getByLabel('Assists').fill('8');
      await page.getByLabel('Appearances').fill('21');
      await page.getByRole('button', { name: 'Save performance stats' }).click();

      await expect(page.getByText('Edit Stats', { exact: true })).toBeVisible();
      await page.getByText('Edit Stats', { exact: true }).click();
      await expect(page.getByLabel('Season or period')).toHaveValue(season);
      await expect(page.getByLabel('Goals')).toHaveValue('13');
      await expect(page.getByLabel('Assists')).toHaveValue('8');
      await expect(page.getByLabel('Appearances')).toHaveValue('21');
      await page.getByRole('button', { name: 'Cancel editing stats' }).click();
    } finally {
      await deletePerformanceSeason(season);
    }
  });

  test('saved opportunity survives tab changes and reload, then restores', async ({ page }) => {
    await login(page);
    await page.goto('/opportunities');
    await page.getByText('All', { exact: true }).click();

    const initialToggle = page
      .getByRole('button', { name: /^(Save|Unsave) opportunity / })
      .first();
    await expect(initialToggle).toBeVisible();
    const initialLabel = await initialToggle.getAttribute('aria-label');
    if (!initialLabel) throw new Error('Opportunity save control is missing a label');
    const club = initialLabel.replace(/^(Save|Unsave) opportunity /, '');
    const initiallySaved = initialLabel.startsWith('Unsave');

    try {
      if (!initiallySaved) await initialToggle.click();
      await page.getByText('Saved', { exact: true }).last().click();
      await expect(
        page.getByRole('button', { name: `Unsave opportunity ${club}` }),
      ).toBeVisible();

      await page.reload();
      await page.getByText('Saved', { exact: true }).last().click();
      const savedToggle = page.getByRole('button', { name: `Unsave opportunity ${club}` });
      await expect(savedToggle).toBeVisible();
      await savedToggle.click();
      await expect(savedToggle).not.toBeVisible();
    } finally {
      if (initiallySaved) {
        await page.getByText('All', { exact: true }).click();
        const restore = page.getByRole('button', { name: `Save opportunity ${club}` });
        if (await restore.isVisible().catch(() => false)) await restore.click();
      }
    }
  });

  test('notification quiet hours persist and can be restored', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    const start = page.getByLabel('Quiet hours start time');
    const end = page.getByLabel('Quiet hours end time');
    const originalStart = await start.inputValue();
    const originalEnd = await end.inputValue();
    const nextStart = originalStart === '23:10' ? '22:15' : '23:10';
    const nextEnd = originalEnd === '06:20' ? '07:25' : '06:20';

    async function savePreferences() {
      await page.getByText('Save Preferences', { exact: true }).click();
      await expect(page.getByText('Saved!', { exact: true })).toBeVisible();
    }

    try {
      await start.fill(nextStart);
      await end.fill(nextEnd);
      await savePreferences();
      await page.reload();
      await expect(page.getByLabel('Quiet hours start time')).toHaveValue(nextStart);
      await expect(page.getByLabel('Quiet hours end time')).toHaveValue(nextEnd);
    } finally {
      await page.goto('/settings');
      await page.getByLabel('Quiet hours start time').fill(originalStart);
      await page.getByLabel('Quiet hours end time').fill(originalEnd);
      await savePreferences();
    }
  });

  test('discover connection persists across reload and returns to its original state', async ({ page }) => {
    await login(page);
    await page.goto('/discover?query=Noura');
    const athlete = page.getByText('Noura Saeed', { exact: true });
    await expect(athlete).toBeVisible();
    const card = athlete.locator('xpath=ancestor::div[.//*[text()="Connect" or text()="Connected"]][1]');
    const toggle = card.getByText(/^(Connect|Connected)$/, { exact: true });
    const original = (await toggle.textContent())?.trim();
    if (original !== 'Connect' && original !== 'Connected') {
      throw new Error('Could not determine initial connection state');
    }
    const flipped = original === 'Connect' ? 'Connected' : 'Connect';

    try {
      await toggle.click();
      await expect(card.getByText(flipped, { exact: true })).toBeVisible();
      await page.reload();
      const reloadedCard = page
        .getByText('Noura Saeed', { exact: true })
        .locator('xpath=ancestor::div[.//*[text()="Connect" or text()="Connected"]][1]');
      await expect(reloadedCard.getByText(flipped, { exact: true })).toBeVisible();
    } finally {
      await page.goto('/discover?query=Noura');
      const restoreAthlete = page.getByText('Noura Saeed', { exact: true });
      await expect(restoreAthlete).toBeVisible();
      const restoreCard = restoreAthlete
        .locator('xpath=ancestor::div[.//*[text()="Connect" or text()="Connected"]][1]');
      const currentToggle = restoreCard.getByText(/^(Connect|Connected)$/, { exact: true });
      await expect(currentToggle).toBeVisible();
      if ((await currentToggle.textContent())?.trim() !== original) {
        await currentToggle.click();
      }
      await expect(restoreCard.getByText(original, { exact: true })).toBeVisible();
    }
  });

  test('notification deep links reach opportunity and message destinations', async ({ page }) => {
    const db = await primaryDatabase();
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error('No authenticated user');
    const stamp = Date.now();
    const opportunityTitle = `Functional opportunity ${stamp}`;
    const messageTitle = `Functional message ${stamp}`;
    const rows = [
      {
        id: randomUUID(),
        user_id: userData.user.id,
        type: 'opportunity',
        title: opportunityTitle,
        body: 'Open the matching opportunities screen.',
        action_url: '/opportunities',
        data: {},
        is_read: false,
        read: false,
      },
      {
        id: randomUUID(),
        user_id: userData.user.id,
        type: 'message',
        title: messageTitle,
        body: 'Open the conversations screen.',
        action_url: '/messages',
        data: {},
        is_read: false,
        read: false,
      },
    ];
    const { error } = await db
      .from('notifications')
      .insert(rows);
    if (error) throw error;

    try {
      await login(page);
      await page.goto('/notifications');
      await page.getByText(opportunityTitle, { exact: true }).click();
      await expect(page).toHaveURL(/\/opportunities$/);
      await expect(page.getByText('Opportunities', { exact: true })).toBeVisible();

      await page.goto('/notifications');
      await page.getByText(messageTitle, { exact: true }).click();
      await expect(page).toHaveURL(/\/messages$/);
      await expect(
        page.getByRole('button', { name: 'Open conversation with Sergio Mendes' }),
      ).toBeVisible();
    } finally {
      const { error: cleanupError } = await db
        .from('notifications')
        .delete()
        .in('id', rows.map((row) => row.id));
      if (cleanupError) throw cleanupError;
    }
  });

  test('logout survives browser back and reload', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await page.getByText('Log Out', { exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Welcome back')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('new athlete can complete signup and permanently delete the account', async ({ page }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const account = {
      email: `functional-mobile-${stamp}@aryaix.com`,
      password: 'Functional123!',
    };

    try {
      await clearSession(page);
      await page.goto('/signup');
      await page.getByLabel('Full name').fill(`Functional Athlete ${stamp}`);
      await page.getByLabel('Email').fill(account.email);
      await page.getByLabel('Password', { exact: true }).fill(account.password);
      await page.getByText('Continue', { exact: true }).click();

      await page.getByLabel('Select your sport').click();
      await page.getByRole('button', { name: 'Football (Soccer)', exact: true }).click();
      await page.getByLabel('Day').click();
      await page.getByRole('button', { name: '01', exact: true }).click();
      await page.getByLabel('Month').click();
      await page.getByRole('button', { name: 'January', exact: true }).click();
      await page.getByLabel('Year').click();
      await page.getByRole('button', { name: '2000', exact: true }).click();
      await page.getByLabel('Hometown').fill('Dubai');
      await page.getByLabel('Current location').fill('Dubai');
      await page.getByLabel('Select nationality').click();
      await page.getByLabel('Search Select Nationality').fill('Emirati');
      await page.getByRole('button', { name: 'Emirati', exact: true }).click();
      await page.getByText('Create Account', { exact: true }).last().click();

      await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
      await expect(page.locator('body')).toContainText(/Dashboard|Welcome|Good /i);

      await page.goto('/settings');
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByText('Delete My Account', { exact: true }).click();
      await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });

      await page.getByLabel('Email').fill(account.email);
      await page.getByLabel('Password', { exact: true }).fill(account.password);
      await page.getByText('Sign In', { exact: true }).click();
      await expect(page.locator('body')).toContainText(/invalid|credential|deleted/i, {
        timeout: 20_000,
      });
    } finally {
      // If the UI deletion assertion fails, remove the disposable account
      // through the same owner-only RPC so the audit cannot leave users behind.
      const env = mobileEnv();
      const db = createClient(
        env.EXPO_PUBLIC_SUPABASE_URL,
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } },
      );
      const { error: signInError } = await db.auth.signInWithPassword(account);
      if (!signInError) {
        const { error: cleanupError } = await db.rpc('delete_own_account');
        if (cleanupError) throw cleanupError;
      }
    }
  });

  test('second athlete can discover, engage with, and comment on a new post', async ({ browser }) => {
    test.setTimeout(120_000);
    const caption = `Functional social ${Date.now()}`;
    const editedCaption = `${caption} edited`;
    const comment = `Second-user reply ${Date.now()}`;
    const authorReply = `Author reply ${Date.now()}`;
    const primaryContext = await browser.newContext();
    const secondaryContext = await browser.newContext();
    const primary = await primaryContext.newPage();
    const secondary = await secondaryContext.newPage();

    try {
      await login(primary, PRIMARY);
      await cleanupFunctionalPosts(primary);
      await primary.goto('/media');
      await primary.getByRole('button', { name: 'Create new post' }).click();
      await primary.getByLabel('Post caption').fill(caption);
      await primary.getByText('Followers', { exact: true }).click();
      await primary.getByText('Public', { exact: true }).click();
      await primary.getByRole('button', { name: 'Publish post' }).click();
      await expect(primary.getByLabel('Post caption')).not.toBeVisible({ timeout: 20_000 });

      await primary.goto('/feed');
      await primary.getByRole('button', { name: 'Show Latest posts' }).click();
      const originalCard = postCard(primary, caption);
      await originalCard.getByRole('button', { name: 'Open post menu' }).click({ force: true });
      await originalCard.getByRole('button', { name: 'Edit post' }).click();
      await originalCard.getByLabel('Edit post caption').fill(editedCaption);
      await originalCard.getByText('Save', { exact: true }).click();
      await expect(primary.getByText(editedCaption)).toBeVisible();
      await primary.reload();
      await expect(primary.getByText(editedCaption)).toBeVisible();

      await login(secondary, SECONDARY);
      await secondary.goto('/feed');
      // "For You" is sport-personalized; Latest is the cross-sport discovery
      // surface where another athlete's new public post must appear.
      await secondary.getByRole('button', { name: 'Show Latest posts' }).click();
      await expect(secondary.getByText(editedCaption)).toBeVisible({ timeout: 20_000 });
      const secondaryCard = postCard(secondary, editedCaption);

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
      const reloadedCard = postCard(secondary, editedCaption);
      await expect(reloadedCard.getByRole('button', { name: 'Unlike post' })).toBeVisible();
      await expect(reloadedCard.getByRole('button', { name: 'Remove saved post' })).toBeVisible();
      await reloadedCard.getByRole('button', { name: 'View comments' }).click();
      await expect(secondary.getByText(comment, { exact: true })).toBeVisible();
      await secondary.getByRole('button', { name: 'Close comments' }).click();

      await primary.goto('/feed');
      const primaryCard = postCard(primary, editedCaption);
      await primaryCard.getByRole('button', { name: 'View comments' }).click();
      await expect(primary.getByText(comment, { exact: true })).toBeVisible();
      await primary.getByText('Reply', { exact: true }).first().click();
      await primary.getByLabel('Comment text').fill(authorReply);
      await primary.getByRole('button', { name: 'Post comment' }).click();
      await expect(primary.getByText(authorReply, { exact: true })).toBeVisible();
      await primary.getByRole('button', { name: 'Close comments' }).click();

      await secondary.reload();
      const secondaryAfterReplyCard = postCard(secondary, editedCaption);
      await secondaryAfterReplyCard.getByRole('button', { name: 'View comments' }).click();
      await expect(secondary.getByText(authorReply, { exact: true })).toBeVisible();
      await secondary.getByRole('button', { name: 'Close comments' }).click();

      await secondaryAfterReplyCard.getByRole('button', { name: 'Open post menu' }).click();
      secondary.once('dialog', (dialog) => dialog.accept());
      await secondaryAfterReplyCard.getByRole('button', { name: 'Block member' }).click();
      await expect(secondary.getByText(editedCaption)).not.toBeVisible();

      await secondary.goto('/network');
      await secondary.getByText('Blocked', { exact: true }).click();
      await expect(secondary.getByText('Rudy Fuller', { exact: true })).toBeVisible();
      await secondary.getByRole('button', { name: 'Unblock Rudy Fuller' }).click();
      await secondary.goto('/feed');
      await secondary.getByRole('button', { name: 'Show Latest posts' }).click();
      await expect(secondary.getByText(editedCaption)).toBeVisible();
    } finally {
      const primaryDb = await databaseFor(PRIMARY);
      const secondaryDb = await databaseFor(SECONDARY);
      const { data: primaryUser } = await primaryDb.auth.getUser();
      if (primaryUser.user) {
        await secondaryDb
          .from('user_blocks')
          .delete()
          .eq('blocked_id', primaryUser.user.id);
      }
      await cleanupFunctionalPosts(primary).catch(() => {});
      await Promise.all([primaryContext.close(), secondaryContext.close()]);
    }
  });
});
