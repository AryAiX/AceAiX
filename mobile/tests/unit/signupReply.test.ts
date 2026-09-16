import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { resolve } from 'node:path';

/*
 * The email somebody gets after signing up on the marketing site.
 *
 * It lives in `site/netlify/functions/submission-created.mjs` and is tested
 * from here because this is where the site's other tests already are, and
 * because the alternative is a file nobody runs.
 *
 * Worth testing at all because it is the only thing in this repository that a
 * stranger reads. A broken layout in the app is a bug report; a sign-up reply
 * that addresses a parent as though they were the child, or that asks somebody
 * to confirm through a link that does not exist, is a different kind of
 * mistake and there is no way to take it back.
 *
 * `fetch` is replaced so nothing leaves the machine and the exact payload
 * handed to Brevo can be read.
 */

const FN = resolve(__dirname, '../../../site/netlify/functions/submission-created.mjs');

type Sent = { url: string; body: any };
let sent: Sent[] = [];

/** Import fresh each time, so module-level env reads are re-evaluated. */
async function load() {
  const mod = await import(`${FN}?t=${Math.random()}`);
  return mod.default as (req: { json: () => Promise<any> }) => Promise<Response>;
}

const submit = async (data: Record<string, string>, form = 'early-access') => {
  const handler = await load();
  return handler({ json: async () => ({ payload: { form_name: form, data } }) });
};

const ADULT = {
  email: 'sam@example.com',
  first_name: 'Sam',
  last_name: 'Okoro',
  role: 'scout',
  sport: 'Tennis',
  city: 'Doha',
  country: 'Qatar',
  age: '18 or over',
};

const GUARDIAN = {
  email: 'parent@example.com',
  first_name: 'Layla',
  last_name: 'Haddad',
  role: 'parent',
  age: 'UNDER 18 — the address above is a parent or guardian',
};

beforeEach(() => {
  sent = [];
  vi.stubGlobal('fetch', async (url: string, init: any) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 201, text: async () => '{}' } as any;
  });
  vi.stubEnv('BREVO_API_KEY', 'test-key');
  vi.stubEnv('SENDER_EMAIL', 'masi.k@aryaix.com');
  /* Quiet: the function logs deliberately, and the log is not what is
     under test here. */
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('an adult signs up', () => {
  it('is written to, from Masi', async () => {
    await submit(ADULT);
    expect(sent).toHaveLength(1);
    const b = sent[0].body;
    expect(b.to[0].email).toBe('sam@example.com');
    expect(b.sender.email).toBe('masi.k@aryaix.com');
    expect(b.htmlContent).toContain('Masi Komeili');
    expect(b.htmlContent).toContain('Head of Marketing &amp; Branding');
  });

  it('reflects what they actually told the form', async () => {
    await submit(ADULT);
    const html = sent[0].body.htmlContent;
    expect(html).toContain('Hi Sam,');
    expect(html).toContain('Doha, Qatar');
    expect(html).toContain('Tennis');
  });

  it('carries a plain-text part', async () => {
    /* Some clients render it, some people prefer it, and a mail with only an
       HTML part scores worse with spam filters. */
    await submit(ADULT);
    expect(sent[0].body.textContent.length).toBeGreaterThan(200);
  });
});

describe('a parent signs a child up', () => {
  it('is addressed to the parent, and says so', async () => {
    await submit(GUARDIAN);
    const b = sent[0].body;
    expect(b.htmlContent).toMatch(/we\s*\n?\s*will write to you, not to them/i);
    expect(b.tags).toContain('guardian');
  });

  it('never greets the parent by the child’s name', async () => {
    /* On the under-18 path the form is filled in by the young athlete, who
       gives a parent's address — so the name on the submission is the child's.
       Opening "Hi Layla," to the parent would be calling them by their
       daughter's name, in the first line of the first email they ever get
       from us. The athlete is named in the sentence instead. */
    await submit(GUARDIAN);
    const b = sent[0].body;
    expect(b.htmlContent).not.toMatch(/Hi Layla/);
    expect(b.textContent).not.toMatch(/Hi Layla/);
    expect(b.htmlContent).toContain('Layla Haddad has asked to hear');
    /* And not on the envelope either. */
    expect(b.to[0].name).toBeUndefined();
  });

  it('never implies we hold the child’s address', async () => {
    await submit(GUARDIAN);
    expect(sent[0].body.to[0].email).toBe('parent@example.com');
  });

  it('still works when only a first name was given', async () => {
    const { last_name, ...noSurname } = GUARDIAN;
    await submit(noSurname);
    const b = sent[0].body;
    expect(b.subject).toMatch(/Layla is on the AceAiX/);
    expect(b.htmlContent).toContain('Layla has asked to hear');
  });

  it('falls back to no name at all', async () => {
    const { first_name, last_name, ...anonymous } = GUARDIAN;
    await submit(anonymous);
    const b = sent[0].body;
    expect(b.subject).toMatch(/young athlete/i);
    expect(b.htmlContent).toContain('A young athlete has asked to hear');
    expect(b.htmlContent).not.toMatch(/undefined|null/);
  });
});

describe('the surname', () => {
  it('is carried on the adult envelope, in full', async () => {
    await submit(ADULT);
    expect(sent[0].body.to[0].name).toBe('Sam Okoro');
  });

  it('is escaped like everything else typed into a public form', async () => {
    await submit({ ...GUARDIAN, last_name: '<b>Haddad</b>' });
    const html = sent[0].body.htmlContent;
    expect(html).not.toContain('<b>Haddad</b>');
    expect(html).toContain('&lt;b&gt;Haddad&lt;/b&gt;');
  });
});

describe('what it must never say', () => {
  it('does not ask anybody to confirm', async () => {
    /* Nothing is clicked and no token exists, so "please confirm" would be a
       promise with no mechanism behind it. If double opt-in is ever added
       through the Supabase route, this test is the thing to change first —
       deliberately, rather than by accident. */
    for (const data of [ADULT, GUARDIAN]) {
      sent = [];
      await submit(data);
      expect(sent[0].body.htmlContent).not.toMatch(/confirm/i);
      expect(sent[0].body.textContent).not.toMatch(/confirm/i);
    }
  });
});

describe('what it must never do', () => {
  it('ignores other forms', async () => {
    await submit({ email: 'a@b.com' }, 'some-other-form');
    expect(sent).toHaveLength(0);
  });

  it('sends nothing without a usable address', async () => {
    await submit({ ...ADULT, email: '' });
    expect(sent).toHaveLength(0);
  });

  it('never fails the sign-up, even with no API key', async () => {
    /* The submission is already stored and the team already notified. A
       courtesy email that could not be sent must not put a red mark against
       something that worked. */
    vi.stubEnv('BREVO_API_KEY', '');
    const res = await submit(ADULT);
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('never fails the sign-up when the provider errors', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down');
    });
    const res = await submit(ADULT);
    expect(res.status).toBe(200);
  });

  it('escapes a name typed into a public form', async () => {
    await submit({ ...ADULT, first_name: '<script>alert(1)</script>' });
    const html = sent[0].body.htmlContent;
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});
