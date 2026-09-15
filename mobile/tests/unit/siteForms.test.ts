import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * The sign-up form on the marketing site, checked for the things that fail
 * *silently*.
 *
 * Netlify parses form markup at DEPLOY time, not when somebody submits. A form
 * missing `data-netlify`, or its `name`, or the hidden `form-name` input, is
 * simply never captured — and the page still says thank you, because the page
 * has no way of knowing. The same goes for a field with no `name`: it vanishes
 * from the submission while remaining perfectly visible on screen.
 *
 * That is the failure mode worth a test. A broken layout is obvious the moment
 * anybody looks at the page; a form that thanks people and stores nothing looks
 * exactly like a working one until launch day, when the list turns out to be
 * empty.
 *
 * The browser-level pass — that submitting actually posts the right body — is
 * separate and needs a server to post to; see site/README.md. This file is the
 * cheap half, and it is the half that catches an innocent edit to a <form> tag.
 */

const SITE = resolve(__dirname, '../../../site');

/**
 * The source of one function, brace-matched.
 *
 * Slicing to the end of the file instead would sweep in whatever is declared
 * next — which here is `done()`, the one function that is *supposed* to
 * mention a confirmation link. The test would then fail on
 * correct code, which is worse than not having it.
 */
function functionBody(src: string, signature: string): string {
  const start = src.indexOf(signature);
  if (start < 0) throw new Error(`no ${signature} in this page`);
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`unbalanced braces after ${signature}`);
}

const PAGES = [
  {
    label: 'the early-access form',
    form: 'early-access',
    /* Every field that must reach the inbox. An entry removed from this list
       is a field silently dropped from the submission. */
    fields: ['first_name', 'email', 'role', 'sport', 'city', 'country', 'consent', 'bot-field'],
    /* `done(already, confirms)` — the second argument is the whole rule. */
    fn: 'function sendToNetlify',
    netlifySignal: /done\(\s*false\s*,\s*false\s*\)/,
  },
] as const;

/**
 * The markup of one named form, so a field found in the other does not count.
 *
 * Called inside each `it` rather than once per describe: at describe time a
 * throw aborts collection and vitest reports the file as "no tests", which
 * tells whoever hit it nothing about what broke. Inside a test it is an
 * ordinary failure with the message attached.
 */
function formMarkup(src: string, name: string): string {
  const open = src.indexOf(`name="${name}"`);
  if (open < 0) {
    throw new Error(
      `No form named "${name}" in site/index.html. If a form was renamed, ` +
      `rename it in PAGES too — and check the two forms still have different ` +
      `names, or Netlify files both sets of submissions in one list.`
    );
  }
  const start = src.lastIndexOf('<form', open);
  const end = src.indexOf('</form>', start);
  if (start < 0 || end < 0) throw new Error(`unbalanced <form> around "${name}"`);
  return src.slice(start, end + '</form>'.length);
}

const FILE = readFileSync(resolve(SITE, 'index.html'), 'utf8');

describe.each(PAGES)('$label', (page) => {
  const markup = () => formMarkup(FILE, page.form);

  it('declares itself to Netlify', () => {
    expect(markup()).toContain(`name="${page.form}"`);
    expect(markup()).toContain('data-netlify="true"');
  });

  it('carries the hidden form-name the AJAX post needs', () => {
    /* Netlify identifies the submission by this field, not by the URL. A
       fetch() to '/' without it is accepted and then discarded. */
    expect(markup()).toContain(`<input type="hidden" name="form-name" value="${page.form}">`);
  });

  it('has a honeypot, declared and present', () => {
    expect(markup()).toContain('data-netlify-honeypot="bot-field"');
    expect(markup()).toContain('name="bot-field"');
  });

  it.each(page.fields)('field %s has a name attribute', (field) => {
    expect(markup()).toContain(`name="${field}"`);
  });

  it('promises a confirmation email only on the route that sends one', () => {
    /* The page runs against two backends and only one of them emails
       anybody. "Check your inbox" must therefore appear inside the branch
       that talks to the function, never in the Netlify branch — telling
       somebody to click a link that will never arrive reads, to them, as a
       sign-up that failed. */
    const netlifyBranch = functionBody(FILE, page.fn);
    expect(netlifyBranch.length).toBeGreaterThan(200); // the branch exists at all
    expect(netlifyBranch).not.toMatch(/check your inbox/i);
    expect(netlifyBranch).not.toMatch(/click the link/i);
    expect(netlifyBranch).toMatch(page.netlifySignal);
  });
});

describe('the page itself', () => {
  it('ships with the Supabase URL empty', () => {
    /* The file in the repository must never carry a project URL: it would be
       deployed to whoever drags the folder, pointing their sign-ups at
       somebody else's project. Filling it in is a deploy-time decision. */
    expect(FILE).toMatch(/window\.ACEAIX_NOTIFY_URL\s*=\s*''\s*;/);
  });

  it('carries no Supabase key of any kind', () => {
    /* The anon key is public, but publishing it here would invite exactly the
       direct-insert design the edge function exists to avoid (docs/25 §3). */
    expect(FILE).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./); // a JWT
    expect(FILE).not.toMatch(/supabase[_-]?anon[_-]?key/i);
  });

  it('makes the hidden attribute actually hide', () => {
    /* `.count`, `.notify`, `.quick` and `.stores` all set `display` from a
       class, which outranks the browser's own `[hidden] { display: none }`.
       Without this rule `el.hidden = true` sets an attribute and nothing
       else, and every swap on this page silently stops working — including
       the countdown's, which has to fire unattended on launch morning. */
    expect(FILE).toMatch(/\[hidden\]\s*\{[^}]*display:\s*none\s*!important/);
  });

  it('has exactly one form, and it is the one Netlify is told about', () => {
    /* There were briefly two — a short capture in the hero and the full form
       at the bottom — which was duplication rather than a funnel: whoever
       filled in the short one was the same person, minus everything that made
       the row useful. If a second ever comes back it needs its own name, or
       Netlify files both sets in one list with half the columns empty. */
    const names = [...FILE.matchAll(/<input type="hidden" name="form-name" value="([^"]+)">/g)]
      .map(m => m[1]);
    expect(names).toEqual(['early-access']);
  });

  it('puts the form where people will see it', () => {
    /* The form sits inside the hero section. Moved below the fold it still
       works perfectly and collects far less, which is the kind of regression
       no error message reports. */
    const hero = FILE.slice(FILE.indexOf('<section class="hero">'), FILE.indexOf('</section>', FILE.indexOf('<section class="hero">')));
    expect(hero).toContain('id="join"');
  });
});

describe('the confirmation wording is gated, not merely absent', () => {
  /* The page delegates its wording to done(already, confirms). Checking
     that sendToNetlify passes `false` is only half the story — it means
     nothing unless done() actually branches on it. Both halves, or neither
     is worth having. */
  const done = functionBody(FILE, 'function done(');

  it('the inbox wording sits behind the confirms flag', () => {
    expect(done).toMatch(/confirms/);
    expect(done.indexOf('confirms')).toBeLessThan(done.search(/check your inbox/i));
  });

  it('the function route asks for it and the Netlify route does not', () => {
    expect(FILE).toMatch(/done\(res\.body\.status === 'already', true\)/);
    expect(functionBody(FILE, 'function sendToNetlify')).toMatch(/done\(false, false\)/);
  });
});
