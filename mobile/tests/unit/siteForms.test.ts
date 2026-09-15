import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * The two sign-up forms on the marketing site, checked for the things that
 * fail *silently*.
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
 * next — which on the early-access page is `done()`, the one function that is
 * *supposed* to mention a confirmation link. The test would then fail on
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
    file: 'index.html',
    label: 'front page',
    form: 'launch-notify',
    /* Every field that must reach the inbox. An entry removed from this list
       is a field silently dropped from the submission. */
    fields: ['first_name', 'email', 'age_confirmed', 'consent', 'bot-field'],
    /* How this page says "you are on the list, and no email is coming". The
       two pages do it differently — this one calls say() inline, the other
       delegates to done() — so the check has to be stated per page rather
       than guessed. */
    netlifySignal: /on the list/i,
  },
  {
    file: 'early-access/index.html',
    label: 'early-access page',
    form: 'early-access',
    fields: ['first_name', 'email', 'role', 'sport', 'country', 'consent', 'bot-field'],
    /* `done(already, confirms)` — the second argument is the whole rule. */
    netlifySignal: /done\(\s*false\s*,\s*false\s*\)/,
  },
  {
    /* Generated from the page above by
       `tools/site/build-early-access-standalone.py`, for deploying the page as
       a site of its own. Checked separately because a generated file is
       exactly the kind that falls a version behind without anybody noticing —
       and because the re-pathing is its own chance to break the form. */
    file: 'early-access-standalone/index.html',
    label: 'early-access page, standalone build',
    form: 'early-access',
    fields: ['first_name', 'email', 'role', 'sport', 'country', 'consent', 'bot-field'],
    netlifySignal: /done\(\s*false\s*,\s*false\s*\)/,
  },
] as const;

describe.each(PAGES)('$label', (page) => {
  const html = readFileSync(resolve(SITE, page.file), 'utf8');

  it('declares itself to Netlify', () => {
    expect(html).toContain(`name="${page.form}"`);
    expect(html).toContain('data-netlify="true"');
  });

  it('carries the hidden form-name the AJAX post needs', () => {
    /* Netlify identifies the submission by this field, not by the URL. A
       fetch() to '/' without it is accepted and then discarded. */
    expect(html).toContain(`<input type="hidden" name="form-name" value="${page.form}">`);
  });

  it('has a honeypot, declared and present', () => {
    expect(html).toContain('data-netlify-honeypot="bot-field"');
    expect(html).toContain('name="bot-field"');
  });

  it.each(page.fields)('field %s has a name attribute', (field) => {
    expect(html).toContain(`name="${field}"`);
  });

  it('ships with the Supabase URL empty', () => {
    /* The file in the repository must never carry a project URL: it would be
       deployed to whoever drags the folder, pointing their sign-ups at
       somebody else's project. Filling it in is a deploy-time decision. */
    expect(html).toMatch(/window\.ACEAIX_NOTIFY_URL\s*=\s*''\s*;/);
  });

  it('carries no Supabase key of any kind', () => {
    /* The anon key is public, but publishing it here would invite exactly the
       direct-insert design the edge function exists to avoid (docs/25 §3). */
    expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./); // a JWT
    expect(html).not.toMatch(/supabase[_-]?anon[_-]?key/i);
  });

  it('promises a confirmation email only on the route that sends one', () => {
    /* Both pages run against two backends and only one of them emails
       anybody. "Check your inbox" must therefore appear inside the branch
       that talks to the function, never in the Netlify branch — telling
       somebody to click a link that will never arrive reads, to them, as a
       sign-up that failed. */
    const netlifyBranch = functionBody(html, 'function sendToNetlify');
    expect(netlifyBranch.length).toBeGreaterThan(200); // the branch exists at all
    expect(netlifyBranch).not.toMatch(/check your inbox/i);
    expect(netlifyBranch).not.toMatch(/click the link/i);
    expect(netlifyBranch).toMatch(page.netlifySignal);
  });
});

describe('early-access: the confirmation wording is gated, not merely absent', () => {
  /* The page above delegates its wording to done(already, confirms). Checking
     that sendToNetlify passes `false` is only half the story — it means
     nothing unless done() actually branches on it. Both halves, or neither
     is worth having. */
  const html = readFileSync(resolve(SITE, 'early-access/index.html'), 'utf8');
  const done = functionBody(html, 'function done(');

  it('the inbox wording sits behind the confirms flag', () => {
    expect(done).toMatch(/confirms/);
    expect(done.indexOf('confirms')).toBeLessThan(done.search(/check your inbox/i));
  });

  it('the function route asks for it and the Netlify route does not', () => {
    expect(html).toMatch(/done\(res\.body\.status === 'already', true\)/);
    expect(functionBody(html, 'function sendToNetlify')).toMatch(/done\(false, false\)/);
  });
});

describe('early-access standalone build', () => {
  /* Generated by tools/site/build-early-access-standalone.py. The script
     asserts its own substitutions, so this is not about the script running —
     it is about somebody editing the generated file by hand, or editing the
     source and forgetting to regenerate. Either leaves a folder that deploys
     cleanly and is quietly a version behind. */
  const html = readFileSync(resolve(SITE, 'early-access-standalone/index.html'), 'utf8');

  it('has no path pointing outside its own folder', () => {
    /* `../assets/…` resolves above the site root once this folder IS the site.
       Netlify answers those with its 404 page, so the logo and the favicon
       simply vanish — with nothing in the console that names the cause. */
    expect(html).not.toMatch(/(?:href|src)="\.\.\//);
  });

  it('links to no page that this deployment does not contain', () => {
    /* The full site's home page is not here. A link to it is a 404 behind the
       logo, which reads as a broken site rather than a missing page.

       Comments are stripped first: the build script leaves one *naming* the
       removed "About AceAiX" link, to explain the gap to the next reader. A
       check that cannot tell an explanation from the thing it explains would
       fail on correct output and teach people to delete the explanation. */
    const live = html.replace(/<!--[\s\S]*?-->/g, '');
    expect(live).not.toMatch(/href="[^"]*index\.html"/);
    expect(live).not.toContain('About AceAiX');
  });

  it('does not claim the marketing site as its canonical URL', () => {
    /* Pointing canonical at aceaix.com/early-access would tell Google the real
       page is one that this deployment does not serve — and, right now, one
       that does not exist at all. */
    expect(html).not.toContain('href="https://aceaix.com/early-access"');
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/">/);
  });

  it('keeps the form identical to the source page', () => {
    /* The re-pathing must not touch the form. Comparing the <form> tag itself
       is the cheapest way to be sure the generated copy still collects. */
    const source = readFileSync(resolve(SITE, 'early-access/index.html'), 'utf8');
    const formTag = (s: string) => s.slice(s.indexOf('<form'), s.indexOf('>', s.indexOf('<form')) + 1);
    expect(formTag(html)).toBe(formTag(source));
  });
});
