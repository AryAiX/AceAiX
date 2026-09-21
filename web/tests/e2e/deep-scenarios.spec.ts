import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEMO, login } from './helpers';

/**
 * Deep QA scenarios: state mutations, validation negatives, bad deep links,
 * session edge cases, cross-role state, empty states, console hygiene and
 * responsive layout. Everything this suite creates or edits is reverted so
 * the suite can be re-run against the shared demo accounts.
 */

/* ── shared helpers ─────────────────────────────────────────── */

/** Known noise that must never fail console hygiene (mirrors mobile walkthrough IGNORE). */
const IGNORE =
  /Failed to load resource|net::ERR|favicon|WebSocket|realtime|Download the React DevTools|useNativeDriver|componentWill|shadow\*|props\.pointerEvents|"shadow"|deprecated/i;

/** Text that should never leak into a rendered page. */
const LEAKED_PLACEHOLDERS = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;

const MOCK_DATA_MARKERS = /Mock data|u_demo/i;

const STAMP = Date.now();

/** Parse .env / .env.local without a dotenv dependency (Playwright does not load them). */
function loadViteEnv(): { url: string; anonKey: string } {
  const values: Record<string, string> = {};
  for (const file of ['.env', '.env.local']) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
      if (match) values[match[1]] = match[2].trim();
    }
  }
  return {
    url: process.env.VITE_SUPABASE_URL ?? values.VITE_SUPABASE_URL ?? '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? values.VITE_SUPABASE_ANON_KEY ?? '',
  };
}
const ENV = loadViteEnv();

async function sessionInfo(page: Page) {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(
      ([key]) => key.startsWith('sb-') && key.endsWith('-auth-token'),
    );
    if (!entry) return null;
    const session = JSON.parse(entry[1]) as { access_token?: string; user?: { id?: string } };
    return { key: entry[0], accessToken: session.access_token ?? null, userId: session.user?.id ?? null };
  });
}

/**
 * Direct PostgREST access with the browser session's JWT. Used only to read
 * originals and to guarantee cleanup even when the UI path under test is broken.
 */
async function rest<T = unknown>(
  page: Page,
  method: 'GET' | 'PATCH' | 'DELETE' | 'POST',
  resource: string,
  body?: unknown,
): Promise<T> {
  const session = await sessionInfo(page);
  expect(session?.accessToken, 'an authenticated session is required for REST access').toBeTruthy();
  expect(ENV.url && ENV.anonKey, 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be resolvable').toBeTruthy();
  const response = await page.request.fetch(`${ENV.url}/rest/v1/${resource}`, {
    method,
    headers: {
      apikey: ENV.anonKey,
      Authorization: `Bearer ${session!.accessToken}`,
      'Content-Type': 'application/json',
      ...(method === 'GET' ? {} : { Prefer: 'return=representation' }),
    },
    data: body === undefined ? undefined : JSON.stringify(body),
  });
  expect(response.ok(), `${method} ${resource} → ${response.status()} ${await response.text()}`).toBe(true);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

interface ConsoleWatch {
  errors: string[];
  pageErrors: string[];
  serverErrors: string[];
  reset: () => void;
}

/** Collect console.error, uncaught exceptions and 5xx responses for the page. */
function watchConsole(page: Page): ConsoleWatch {
  const watch: ConsoleWatch = {
    errors: [],
    pageErrors: [],
    serverErrors: [],
    reset() { watch.errors.length = 0; watch.pageErrors.length = 0; watch.serverErrors.length = 0; },
  };
  page.on('console', (message) => {
    if (message.type() === 'error' && !IGNORE.test(message.text())) {
      watch.errors.push(message.text().slice(0, 300));
    }
  });
  page.on('pageerror', (error) => {
    if (!IGNORE.test(error.message)) watch.pageErrors.push(error.message.slice(0, 300));
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      watch.serverErrors.push(`${response.status()} ${response.url().slice(0, 200)}`);
    }
  });
  return watch;
}

/** Wait until no loading spinners remain in the given scope (or time out). */
async function waitForSettled(scope: Locator, timeout = 20_000) {
  await expect(scope.locator('.animate-spin')).toHaveCount(0, { timeout });
}

/** A page must never render blank, leak placeholders, or show the Vite error overlay. */
async function expectHealthyRender(page: Page) {
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await waitForSettled(page.locator('body'));
  const text = (await page.locator('body').innerText()).trim();
  expect(text.length, 'page must not render blank').toBeGreaterThan(40);
  expect(text).not.toMatch(LEAKED_PLACEHOLDERS);
  await expect(page.locator('body')).not.toContainText(MOCK_DATA_MARKERS);
}

async function clearBrowserSession(page: Page) {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Read the "N Lists · M Athletes" badge on the watchlists header. */
async function watchlistTotals(page: Page) {
  // The badge renders "0 Lists · 0 Athletes" while the query is in flight.
  await waitForSettled(page.locator('main'));
  await expect(page.locator('main')).not.toContainText(/Loading watchlists/i);
  const badge = page.locator('main').getByText(/\d+ Lists · \d+ Athletes/i);
  await expect(badge).toBeVisible({ timeout: 15_000 });
  // textContent (not innerText): the badge is CSS-uppercased.
  const match = ((await badge.textContent()) ?? '').match(/(\d+) Lists · (\d+) Athletes/i);
  expect(match, 'watchlist header badge should read "N Lists · M Athletes"').toBeTruthy();
  return { lists: Number(match![1]), athletes: Number(match![2]) };
}

/* ── 1. mutations that persist ──────────────────────────────── */

test.describe('profile and settings mutations persist across reloads', () => {
  test('athlete profile city edit survives a hard reload, then is reverted', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    const [original] = await rest<Array<{ city: string | null }>>(
      page, 'GET', `user_profiles?id=eq.${session.userId}&select=city`,
    );

    await page.goto('/athlete/profile');
    const city = page.getByPlaceholder('City');
    await expect(city).toBeVisible({ timeout: 15_000 });
    await expect(city).toHaveValue(original.city ?? '');
    const newCity = `QA City ${STAMP}`;

    try {
      await city.fill(newCity);
      await page.getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('alert')).toHaveCount(0);

      await page.reload();
      await expect(page.getByPlaceholder('City')).toHaveValue(newCity, { timeout: 15_000 });
      // The hero chip reflects the saved city too.
      await expect(page.locator('main')).toContainText(newCity);

      // Revert through the same UI path so the round-trip is exercised both ways.
      await page.getByPlaceholder('City').fill(original.city ?? '');
      await page.getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 15_000 });
      await page.reload();
      await expect(page.getByPlaceholder('City')).toHaveValue(original.city ?? '', { timeout: 15_000 });
    } finally {
      await rest(page, 'PATCH', `user_profiles?id=eq.${session.userId}`, { city: original.city });
    }
  });

  test('notification preference toggle persists and is reverted', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    const privateSelect = `user_private?user_id=eq.${session.userId}&select=notification_preferences`;
    const [originalPrivate] = await rest<Array<{ notification_preferences: Record<string, boolean> }>>(
      page, 'GET', privateSelect,
    );

    const privateLoaded = page.waitForResponse((r) => r.url().includes('/rest/v1/user_private') && r.request().method() === 'GET');
    await page.goto('/athlete/settings');
    await privateLoaded; // steady state: stored preferences are hydrated before we interact
    await page.getByRole('main').getByRole('button', { name: /notifications/i }).click();
    await expect(page.getByRole('heading', { name: /notification preferences/i })).toBeVisible();

    const toggle = page.getByRole('switch').first(); // "Scout views your profile"
    await expect(toggle).toBeVisible();
    const before = (await toggle.getAttribute('aria-checked')) === 'true';

    const upsert = () => page.waitForResponse((r) => r.url().includes('/rest/v1/user_private') && r.request().method() === 'POST');
    try {
      let saved = upsert();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(!before));
      expect((await saved).ok(), 'preference upsert must succeed').toBe(true); // the UI is optimistic; wait for the write

      await page.reload();
      await page.getByRole('main').getByRole('button', { name: /notifications/i }).click();
      const reloaded = page.getByRole('switch').first();
      await expect(reloaded).toHaveAttribute('aria-checked', String(!before), { timeout: 15_000 });

      saved = upsert();
      await reloaded.click();
      await expect(reloaded).toHaveAttribute('aria-checked', String(before));
      expect((await saved).ok()).toBe(true);
      await page.reload();
      await page.getByRole('main').getByRole('button', { name: /notifications/i }).click();
      await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', String(before), { timeout: 15_000 });
    } finally {
      await rest(page, 'PATCH', `user_private?user_id=eq.${session.userId}`, {
        notification_preferences: originalPrivate?.notification_preferences ?? {},
      });
    }
  });

  test('notification switches are inert until preferences hydrate, then the first click flips and persists', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    const privateSelect = `user_private?user_id=eq.${session.userId}&select=notification_preferences`;
    const [originalPrivate] = await rest<Array<{ notification_preferences: Record<string, boolean> }>>(page, 'GET', privateSelect);

    // Hold the user_private GET so the switch is rendered before its stored value is known.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/rest/v1/user_private*', async (route) => {
      if (route.request().method() === 'GET') await gate;
      await route.continue();
    });

    try {
      await page.goto('/athlete/settings');
      await page.getByRole('main').getByRole('button', { name: /notifications/i }).click();
      const toggle = page.getByRole('switch').first();
      await expect(toggle).toBeVisible();

      // While loading, the switch must not accept input (a click here used to be a silent no-op).
      await expect(toggle).toHaveAttribute('aria-disabled', 'true');
      await toggle.click({ force: true });
      await expect(page.getByRole('status')).toContainText(/loading your preferences/i);

      release();
      await expect(toggle).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 });
      const before = (await toggle.getAttribute('aria-checked')) === 'true';

      const saved = page.waitForResponse((r) => r.url().includes('/rest/v1/user_private') && r.request().method() === 'POST');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(!before));
      expect((await saved).ok()).toBe(true);
      const [stored] = await rest<Array<{ notification_preferences: Record<string, boolean> }>>(page, 'GET', privateSelect);
      expect(stored?.notification_preferences?.scout_view, 'stored preference must match the flipped state').toBe(!before);
    } finally {
      await page.unroute('**/rest/v1/user_private*');
      await rest(page, 'PATCH', `user_private?user_id=eq.${session.userId}`, {
        notification_preferences: originalPrivate?.notification_preferences ?? {},
      });
    }
  });

  test('privacy controls are honest placeholders, not fake interactive switches', async ({ page }) => {
    await login(page, 'athlete');
    await page.goto('/athlete/settings');
    await page.getByRole('main').getByRole('button', { name: /privacy/i }).click();
    await expect(page.getByRole('heading', { name: /privacy controls/i })).toBeVisible();
    // Copy says these are not stored yet, so none of them may be exposed as a live switch.
    await expect(page.getByRole('switch')).toHaveCount(0);
    await expect(page.locator('main')).toContainText(/not stored yet/i);
  });
});

/* ── 2. form validation negatives ───────────────────────────── */

test.describe('form validation rejects bad input and persists nothing', () => {
  test('athlete profile: empty full name is rejected and not saved', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    const [original] = await rest<Array<{ full_name: string | null }>>(
      page, 'GET', `user_profiles?id=eq.${session.userId}&select=full_name`,
    );
    expect(original.full_name, 'demo athlete should have a name to protect').toBeTruthy();

    await page.goto('/athlete/profile');
    const name = page.getByPlaceholder('Your full name');
    await expect(name).toHaveValue(original.full_name!, { timeout: 15_000 });

    try {
      await name.fill('');
      await page.getByRole('button', { name: /^save$/i }).click();

      await expect.soft(page.getByRole('alert'), 'an inline validation error must appear').toBeVisible({ timeout: 10_000 });
      await expect.soft(name).toHaveAttribute('aria-invalid', 'true');
      await expect.soft(page.getByRole('button', { name: /saved!/i })).toHaveCount(0);

      const [after] = await rest<Array<{ full_name: string | null }>>(
        page, 'GET', `user_profiles?id=eq.${session.userId}&select=full_name`,
      );
      expect(after.full_name, 'empty name must not be persisted').toBe(original.full_name);
    } finally {
      await rest(page, 'PATCH', `user_profiles?id=eq.${session.userId}`, { full_name: original.full_name });
    }
  });

  test('athlete profile: oversized full name is rejected with a readable error', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    const [original] = await rest<Array<{ full_name: string | null }>>(
      page, 'GET', `user_profiles?id=eq.${session.userId}&select=full_name`,
    );

    await page.goto('/athlete/profile');
    const name = page.getByPlaceholder('Your full name');
    await expect(name).toHaveValue(original.full_name ?? '', { timeout: 15_000 });

    try {
      await name.fill('X'.repeat(300));
      await page.getByRole('button', { name: /^save$/i }).click();

      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible({ timeout: 10_000 });
      // A raw Postgres/PostgREST message is not an acceptable validation error.
      await expect.soft(alert).not.toContainText(/character varying|value too long|PGRST|violates/i);
      await expect(page.getByRole('button', { name: /saved!/i })).toHaveCount(0);

      const [after] = await rest<Array<{ full_name: string | null }>>(
        page, 'GET', `user_profiles?id=eq.${session.userId}&select=full_name`,
      );
      expect(after.full_name).toBe(original.full_name);
    } finally {
      await rest(page, 'PATCH', `user_profiles?id=eq.${session.userId}`, { full_name: original.full_name });
    }
  });

  test('athlete profile: out-of-range height is rejected and not saved', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'peter');
    const session = (await sessionInfo(page))!;
    const [original] = await rest<Array<{ id: string; height_cm: number | null }>>(
      page, 'GET', `athlete_profiles?user_id=eq.${session.userId}&select=id,height_cm`,
    );
    expect(original?.id, 'account must own an athlete_profiles row').toBeTruthy();

    await page.goto('/athlete/profile');
    await page.getByRole('button', { name: /physical/i }).click();
    const height = page.getByPlaceholder('e.g. 180');
    await expect(height).toBeVisible();
    const min = Number(await height.getAttribute('min'));
    const max = Number(await height.getAttribute('max'));
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(min);

    try {
      await height.fill(String(max + 779)); // 999 cm
      await page.getByRole('button', { name: /^save$/i }).click();

      await expect.soft(page.getByRole('alert'), 'height outside min/max must produce an inline error').toBeVisible({ timeout: 10_000 });
      await expect.soft(page.getByRole('button', { name: /saved!/i })).toHaveCount(0);

      const [after] = await rest<Array<{ height_cm: number | null }>>(
        page, 'GET', `athlete_profiles?id=eq.${original.id}&select=height_cm`,
      );
      expect(Number(after.height_cm ?? 0)).toBe(Number(original.height_cm ?? 0));
    } finally {
      await rest(page, 'PATCH', `athlete_profiles?id=eq.${original.id}`, { height_cm: original.height_cm });
    }
  });

  test('settings: invalid email and phone are rejected and not saved', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    const privateRows = await rest<Array<{ email: string | null; phone: string | null }>>(
      page, 'GET', `user_private?user_id=eq.${session.userId}&select=email,phone`,
    );
    const original = privateRows[0] ?? { email: null, phone: null };

    await page.goto('/athlete/settings');
    const email = page.locator('input[type="email"]');
    const phone = page.getByPlaceholder('+971 50 000 0000');
    await expect(email).toBeVisible();

    try {
      await email.fill('not-an-email');
      await phone.fill('abc-not-a-phone');
      await page.getByRole('button', { name: /save changes/i }).click();

      // One inline alert per invalid field, each tied to its input via aria-describedby.
      await expect.soft(page.getByRole('alert'), 'invalid email/phone must produce inline errors').toHaveCount(2, { timeout: 10_000 });
      await expect.soft(email).toHaveAttribute('aria-invalid', 'true');
      await expect.soft(phone).toHaveAttribute('aria-invalid', 'true');
      await expect.soft(page.getByRole('button', { name: /saved!/i })).toHaveCount(0);

      const after = await rest<Array<{ email: string | null; phone: string | null }>>(
        page, 'GET', `user_private?user_id=eq.${session.userId}&select=email,phone`,
      );
      expect(after[0]?.email ?? null).toBe(original.email);
      expect(after[0]?.phone ?? null).toBe(original.phone);
    } finally {
      const exists = await rest<unknown[]>(page, 'GET', `user_private?user_id=eq.${session.userId}&select=user_id`);
      if (exists.length > 0) {
        await rest(page, 'PATCH', `user_private?user_id=eq.${session.userId}`, {
          email: original.email, phone: original.phone,
        });
      }
    }
  });

  test('watchlist: blank name cannot be created and duplicate names are refused', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'scout');
    await page.goto('/recruiter/watchlists');
    const before = await watchlistTotals(page);

    await page.getByRole('button', { name: /new watchlist/i }).first().click();
    const nameInput = page.getByPlaceholder('Watchlist name…');
    await nameInput.fill('   ');
    await page.getByRole('button', { name: /^create$/i }).click();
    // Nothing created: the form stays open and the list count is unchanged.
    await expect(nameInput).toBeVisible();
    expect((await watchlistTotals(page)).lists).toBe(before.lists);

    // Duplicate of an existing list (case-insensitive) must be refused with a readable error.
    const uniqueName = `QA Dup ${STAMP}`;
    const session = (await sessionInfo(page))!;
    try {
      await nameInput.fill(uniqueName);
      await page.getByRole('button', { name: /^create$/i }).click();
      await expect(page.locator('main')).toContainText(uniqueName, { timeout: 15_000 });
      expect((await watchlistTotals(page)).lists).toBe(before.lists + 1);

      await page.getByRole('button', { name: /new watchlist/i }).first().click();
      await page.getByPlaceholder('Watchlist name…').fill(uniqueName.toUpperCase());
      await page.getByRole('button', { name: /^create$/i }).click();
      await expect(page.getByRole('alert')).toContainText(/already exists/i, { timeout: 15_000 });
      expect((await watchlistTotals(page)).lists).toBe(before.lists + 1);
    } finally {
      const rows = await rest<Array<{ id: string }>>(
        page, 'GET', `watchlists?user_id=eq.${session.userId}&name=ilike.${encodeURIComponent(uniqueName)}&select=id`,
      );
      for (const { id } of rows) await rest(page, 'DELETE', `watchlists?id=eq.${id}`);
    }
  });
});

/* ── 3. deep links and bad params ───────────────────────────── */

test.describe('deep links with bad parameters degrade gracefully', () => {
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';

  const cases: Array<[string, RegExp]> = [
    [`/athletes/${NIL_UUID}`, /Athlete not found/i],
    ['/athletes/not-a-uuid', /Athlete not found/i],
    [`/clubs/${NIL_UUID}`, /Club not found/i],
    ['/clubs/not-a-uuid', /Club not found/i],
    ['/coaches/not-a-uuid', /Coach not found/i],
    ['/opportunities/not-a-real-id', /Page not found/i],
    ['/this/route/does/not/exist', /Page not found/i],
  ];

  test('public bad ids render a not-found state with a way out', async ({ page }) => {
    test.setTimeout(120_000);
    const watch = watchConsole(page);
    for (const [route, text] of cases) {
      await test.step(route, async () => {
        watch.reset();
        await page.goto(route);
        await expect(page.locator('body')).toContainText(text, { timeout: 20_000 });
        await expectHealthyRender(page);
        // Every not-found state must offer a recovery link.
        await expect(page.getByRole('link', { name: /browse|go home|back|feed|sign in/i }).first()).toBeVisible();
        expect(watch.pageErrors, `uncaught errors on ${route}`).toEqual([]);
      });
    }
  });

  test('authenticated bad deep links do not break the portal shell', async ({ page }) => {
    const watch = watchConsole(page);
    await login(page, 'athlete');

    await page.goto('/athlete/opportunities/not-a-real-id');
    await expect(page.locator('body')).toContainText(/Page not found/i);
    await expectHealthyRender(page);

    await page.goto('/athlete/messages?user=not-a-uuid');
    await expect(page).toHaveURL(/\/athlete\/messages/, { timeout: 20_000 });
    await expectHealthyRender(page);
    await expect(page.locator('main')).toContainText(/Messages/i);
    expect(watch.pageErrors).toEqual([]);
  });
});

/* ── 4. session edge cases ──────────────────────────────────── */

test.describe.serial('session edge cases', () => {
  test('removing the auth token mid-session sends the next navigation to login', async ({ page }) => {
    await login(page, 'athlete');
    const session = (await sessionInfo(page))!;
    await page.evaluate((key) => localStorage.removeItem(key), session.key);

    await page.goto('/athlete/settings');
    await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Manage your account preferences/i);
  });

  test('browser Back after sign-out does not reveal authenticated content', async ({ page }) => {
    await login(page, 'athlete');
    await page.goto('/athlete/settings');
    await expect(page.locator('main')).toContainText(/Manage your account preferences/i);

    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('button', { name: /^sign out$/i }).click();
    // AppLayout.handleSignOut navigates to "/", but RequireAuth's redirect can win the race.
    await expect(page).toHaveURL(/(\/|\/auth\/login)$/, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(/Manage your account preferences/i);
    expect(await sessionInfo(page)).toBeNull();

    await page.goBack();
    await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/Manage your account preferences/i);

    // And a fresh protected navigation is still refused.
    await page.goto('/athlete/dashboard');
    await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 20_000 });
  });

  test('login redirects back to the originally requested protected route', async ({ page }) => {
    await clearBrowserSession(page);
    await page.goto('/athlete/opportunities');
    await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 20_000 });

    const cont = page.getByRole('button', { name: /continue/i });
    if (await cont.isVisible().catch(() => false)) await cont.click({ force: true });
    await page.locator('input[type="email"]').fill(DEMO.athlete.email);
    await page.locator('input[type="password"]').fill(DEMO.athlete.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/athlete\/(opportunities|dashboard)$/, { timeout: 20_000 });
    await expect(page.locator('main')).not.toContainText(/welcome back/i);
  });
});

/* ── 5. cross-role state: watchlists ────────────────────────── */

test.describe.serial('scout watchlist round trip', () => {
  test('saving an athlete from search shows up in watchlists, removal clears it, counts update', async ({ page }) => {
    test.setTimeout(150_000);
    await login(page, 'scout');
    const session = (await sessionInfo(page))!;

    const listSelect = `watchlists?user_id=eq.${session.userId}&select=id,name,watchlist_athletes(id,athlete:athlete_profiles(user:user_profiles(full_name)))`;
    type ListRow = { id: string; name: string; watchlist_athletes: Array<{ id: string; athlete: { user: { full_name: string } | null } | null }> };
    const isDefaultList = (l: ListRow) => l.name.trim().toLowerCase() === 'saved prospects';
    const hadDefaultList = (await rest<ListRow[]>(page, 'GET', listSelect)).some(isDefaultList);

    await page.goto('/recruiter/watchlists');
    const before = await watchlistTotals(page);

    await page.goto('/recruiter/search');
    await expect(page.getByRole('heading', { name: /search athletes/i })).toBeVisible();
    await waitForSettled(page.locator('main'));

    const firstSave = page.getByRole('button', { name: /^save$/i }).first();
    await expect(firstSave, 'at least one athlete must be un-saved to run the round trip').toBeVisible({ timeout: 15_000 });
    const athleteName = (await firstSave
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
      .locator('p.text-sm.font-bold').first().innerText()).trim();
    expect(athleteName.length).toBeGreaterThan(0);
    // Pin the card by athlete name so it does not re-resolve once the button label changes.
    const cardFor = (name: string) => page.locator('main div.rounded-2xl')
      .filter({ has: page.locator('p.text-sm.font-bold', { hasText: name }) })
      .filter({ has: page.getByRole('button', { name: /^view$/i }) })
      .first();
    const card = cardFor(athleteName);

    try {
      await card.getByRole('button', { name: /^save$/i }).click();
      await expect(card.getByRole('button', { name: /^saved$/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('alert')).toHaveCount(0);
      // Saving is never silent: the outcome (including an auto-created default list) is announced.
      const status = page.getByRole('status');
      await expect(status).toContainText(new RegExp(`${hadDefaultList ? 'Added' : 'Created your'}.*Saved prospects`, 'i'));
      await expect(status.getByRole('link', { name: /view watchlists/i })).toBeVisible();

      await page.goto('/recruiter/watchlists');
      const afterAdd = await watchlistTotals(page);
      expect(afterAdd.athletes).toBe(before.athletes + 1);

      const savedList = page.locator('main button').filter({ hasText: /^Saved prospects/ }).first();
      await savedList.click();
      await expect(page.getByRole('heading', { name: /^Saved prospects$/ })).toBeVisible();
      // The athlete row is the rounded card that carries the name AND action buttons
      // (the "Top Performer" card repeats the name but has no buttons).
      // Rows are `flex items-center … rounded-2xl`; the wrapping panel is `rounded-2xl overflow-hidden`.
      const row = page.locator('main div.flex.items-center.rounded-2xl')
        .filter({ has: page.locator('p.text-sm.font-bold', { hasText: athleteName }) })
        .filter({ has: page.locator('button') })
        .first();
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row.locator('button')).toHaveCount(2); // [open profile, delete]

      await row.hover();
      // Delete is icon-only and arms a confirm "Remove" button.
      await row.locator('button').last().click({ timeout: 15_000 });
      await row.getByRole('button', { name: /remove/i }).click({ timeout: 15_000 });

      await expect(page.locator('main').getByText(athleteName, { exact: true })).toHaveCount(0, { timeout: 15_000 });
      const afterRemove = await watchlistTotals(page);
      expect(afterRemove.athletes).toBe(before.athletes);

      // Search page must reflect the removal.
      await page.goto('/recruiter/search');
      await waitForSettled(page.locator('main'));
      await expect(cardFor(athleteName).getByRole('button', { name: /^save$/i })).toBeVisible({ timeout: 15_000 });
    } finally {
      // Safety net: strip any leftover row for this athlete, and drop the auto-created
      // "Saved prospects" list if the scout did not have one before this test.
      const lists = await rest<ListRow[]>(page, 'GET', listSelect);
      for (const list of lists) {
        for (const row of list.watchlist_athletes) {
          if (row.athlete?.user?.full_name === athleteName) await rest(page, 'DELETE', `watchlist_athletes?id=eq.${row.id}`);
        }
      }
      if (!hadDefaultList) {
        for (const list of lists.filter(isDefaultList)) {
          const remaining = list.watchlist_athletes.filter((r) => r.athlete?.user?.full_name !== athleteName).length;
          if (remaining === 0) await rest(page, 'DELETE', `watchlists?id=eq.${list.id}`);
        }
      }
    }
  });
});

/* ── 6. empty states ────────────────────────────────────────── */

test.describe('empty states render real content with a call to action', () => {
  /** Fresh demo athlete has no media/matches/clearance/trajectory: each page must say so and offer a next step. */
  const emptyStates: Array<{ route: string; emptyText: RegExp; cta: RegExp }> = [
    { route: '/athlete/media', emptyText: /No clips yet/i, cta: /upload|browse files/i },
    { route: '/athlete/performance', emptyText: /No matches yet|No match records yet/i, cta: /add match/i },
    { route: '/athlete/medical', emptyText: /No clearance on file/i, cta: /how to add records|connect|upload/i },
    { route: '/athlete/career', emptyText: /No trajectory data yet/i, cta: /.+/ },
    { route: '/athlete/messages', emptyText: /Select a conversation|Start the conversation/i, cta: /new message/i },
  ];
  /** Data pages: must render numbers without placeholders and settle without a spinner. */
  const dataRoutes = ['/athlete/network', '/athlete/analytics', '/athlete/ai'];

  test('fresh athlete pages never show a bare spinner or leaked placeholders', async ({ page }) => {
    test.setTimeout(180_000);
    const watch = watchConsole(page);
    await login(page, 'athlete');
    for (const { route, emptyText, cta } of emptyStates) {
      await test.step(route, async () => {
        watch.reset();
        await page.goto(route);
        const main = page.locator('main');
        await waitForSettled(main, 25_000);
        await expect(main).toContainText(emptyText, { timeout: 15_000 });
        const text = (await main.innerText()).trim();
        expect(text, `${route} leaked a placeholder`).not.toMatch(LEAKED_PLACEHOLDERS);
        await expect(main).not.toContainText(MOCK_DATA_MARKERS);
        await expect(
          main.getByRole('button', { name: cta }).or(main.getByRole('link', { name: cta })).first(),
          `${route} needs a call to action`,
        ).toBeVisible();
        expect(watch.pageErrors, `uncaught error on ${route}`).toEqual([]);
      });
    }
    for (const route of dataRoutes) {
      await test.step(route, async () => {
        watch.reset();
        await page.goto(route);
        const main = page.locator('main');
        await waitForSettled(main, 25_000);
        // Skeleton loaders (animate-pulse) carry no text: wait for real content, never forever.
        await expect.poll(async () => (await main.innerText()).trim().length, {
          message: `${route} must render content (not a bare skeleton)`,
          timeout: 25_000,
        }).toBeGreaterThan(40);
        const text = (await main.innerText()).trim();
        expect(text, `${route} leaked a placeholder`).not.toMatch(LEAKED_PLACEHOLDERS);
        await expect(main).not.toContainText(MOCK_DATA_MARKERS);
        expect(watch.pageErrors, `uncaught error on ${route}`).toEqual([]);
      });
    }
  });

  test('scout and partner data pages settle without placeholders', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'scout');
    for (const route of ['/recruiter/messages', '/recruiter/analytics']) {
      await page.goto(route);
      const main = page.locator('main');
      await waitForSettled(main, 25_000);
      const text = (await main.innerText()).trim();
      expect(text.length, `${route} must render content`).toBeGreaterThan(40);
      expect(text, `${route} leaked a placeholder`).not.toMatch(LEAKED_PLACEHOLDERS);
    }
    // Conversation entries must be operable controls, not bare clickable <div>s.
    await page.goto('/recruiter/messages');
    await waitForSettled(page.locator('main'), 25_000);
    const conversation = page.locator('main').getByText('Fresh Athlete', { exact: true }).first();
    await expect(conversation).toBeVisible();
    const operable = await conversation.evaluate((el) =>
      !!el.closest('button, a, [role="button"], [role="option"], [role="listitem"] [tabindex], [tabindex]'),
    );
    expect(operable, 'conversation list entries must be keyboard-operable (button/link/role+tabindex)').toBe(true);

    await login(page, 'medical');
    await page.goto('/partner/requests');
    const main = page.locator('main');
    await waitForSettled(main, 25_000);
    const text = (await main.innerText()).trim();
    expect(text.length).toBeGreaterThan(40);
    expect(text).not.toMatch(LEAKED_PLACEHOLDERS);
    await expect(main).toContainText(/Verification Requests/i);
  });

  test('recruiter search with impossible filters shows a clearable empty state', async ({ page }) => {
    await login(page, 'scout');
    await page.goto('/recruiter/search');
    await waitForSettled(page.locator('main'));
    await page.getByPlaceholder('Name or position…').fill(`zzz-no-such-athlete-${STAMP}`);
    await expect(page.locator('main')).toContainText(/No athletes match your filters/i, { timeout: 15_000 });
    await page.getByRole('button', { name: /^clear filters$/i }).click();
    await expect(page.getByPlaceholder('Name or position…')).toHaveValue('');
    await expect(page.getByRole('button', { name: /^view$/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});

/* ── 7. console hygiene ─────────────────────────────────────── */

test.describe('console hygiene on major pages', () => {
  const PUBLIC_ROUTES = ['/', '/athletes', '/clubs', '/feed', '/discover', '/plans', '/auth/login', '/auth/register'];
  const ROLE_ROUTES: Record<keyof typeof DEMO, string[]> = {
    athlete: ['/athlete/dashboard', '/athlete/profile', '/athlete/opportunities', '/athlete/messages', '/athlete/settings'],
    peter: [],
    athlete1: [],
    scout: ['/recruiter/dashboard', '/recruiter/search', '/recruiter/watchlists', '/recruiter/messages'],
    admin: ['/admin/dashboard', '/admin/users', '/admin/verification', '/admin/analytics'],
    medical: ['/partner/dashboard', '/partner/requests'],
  };

  async function assertClean(page: Page, watch: ConsoleWatch, route: string) {
    await page.goto(route);
    await waitForSettled(page.locator('body'), 25_000);
    await page.waitForTimeout(750); // let late effects/queries flush
    expect(watch.pageErrors, `uncaught exceptions on ${route}`).toEqual([]);
    expect(watch.errors, `console.error on ${route}`).toEqual([]);
    expect(watch.serverErrors, `5xx responses on ${route}`).toEqual([]);
  }

  test('public pages are free of console errors', async ({ page }) => {
    test.setTimeout(120_000);
    const watch = watchConsole(page);
    for (const route of PUBLIC_ROUTES) {
      await test.step(route, async () => { watch.reset(); await assertClean(page, watch, route); });
    }
  });

  for (const role of ['athlete', 'scout', 'admin', 'medical'] as const) {
    test(`${role} pages are free of console errors`, async ({ page }) => {
      test.setTimeout(120_000);
      const watch = watchConsole(page);
      await login(page, role);
      for (const route of ROLE_ROUTES[role]) {
        await test.step(route, async () => { watch.reset(); await assertClean(page, watch, route); });
      }
    });
  }
});

/* ── 8. responsive ──────────────────────────────────────────── */

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  async function expectNoHorizontalOverflow(page: Page, label: string) {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector('main');
      return {
        doc: doc.scrollWidth - doc.clientWidth,
        main: main ? main.scrollWidth - main.clientWidth : 0,
      };
    });
    expect(overflow.doc, `${label}: document overflows horizontally`).toBeLessThanOrEqual(2);
    expect(overflow.main, `${label}: <main> overflows horizontally`).toBeLessThanOrEqual(2);
  }

  test('athlete portal nav is reachable and pages do not overflow', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'athlete');
    for (const route of ['/athlete/dashboard', '/athlete/profile', '/athlete/opportunities']) {
      await page.goto(route);
      await waitForSettled(page.locator('main'), 25_000);
      await expectNoHorizontalOverflow(page, route);
    }

    await page.getByRole('button', { name: /open navigation/i }).click();
    const settingsLink = page.getByRole('link', { name: /^settings$/i }).last();
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await expect(page).toHaveURL(/\/athlete\/settings$/);
    await expect(page.getByRole('link', { name: /^settings$/i }).last()).toBeHidden(); // drawer closed

    // Tab labels are hidden below the `sm` breakpoint; the buttons still need an accessible name.
    const main = page.getByRole('main');
    for (const tab of [/^profile$/i, /^notifications$/i, /^privacy$/i, /^security$/i]) {
      await expect(main.getByRole('button', { name: tab }), `settings tab ${tab} has no accessible name at 390px`).toBeVisible();
    }
    await main.getByRole('button', { name: /^security$/i }).click();
    await expect(page.getByRole('heading', { name: /^security$/i })).toBeVisible();
  });

  test('scout search and public athlete profile fit a phone screen', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'scout');
    await page.goto('/recruiter/search');
    await waitForSettled(page.locator('main'), 25_000);
    await expectNoHorizontalOverflow(page, '/recruiter/search');

    await page.getByRole('button', { name: /^view$/i }).first().click();
    await expect(page).toHaveURL(/\/athletes\/[^/?#]+$/);
    await waitForSettled(page.locator('body'), 25_000);
    await expectNoHorizontalOverflow(page, 'public athlete profile');
    // The mobile sticky action bar must expose Follow and Message.
    await expect(page.getByRole('button', { name: /^follow(?:ing)?$/i }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /^message$/i }).last()).toBeVisible();

    await page.goto('/auth/login');
    await expectNoHorizontalOverflow(page, '/auth/login');
  });
});
