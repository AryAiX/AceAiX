/**
 * The reply somebody gets after signing up for early access.
 *
 * Netlify Forms tells *you* about a submission; it has no autoresponder. But
 * Netlify fires a `submission-created` event on every verified submission, and
 * a function with this exact filename is what receives it. Nothing wires them
 * together — the name is the wiring.
 *
 * So: form → Netlify stores it and emails Maysam → this runs → the person who
 * signed up gets a note back from Masi.
 *
 * ── What this is not ────────────────────────────────────────────────────────
 *
 * It is not verification. Nobody clicks anything; the address is not proved to
 * be real. The wording reflects that — it welcomes, it does not say "confirm".
 * Double opt-in needs somewhere to keep a token, which means the Supabase route
 * (docs/25). Until then an address that was typed wrong simply bounces.
 *
 * ── Failure is deliberately quiet ───────────────────────────────────────────
 *
 * This returns 200 whatever happens. The submission is already saved and
 * Maysam already knows; a failure to send a courtesy email must not turn into
 * a red mark on a sign-up that actually succeeded. Failures go to the function
 * log, which is where somebody looking for them will look.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/* Set in Netlify under Site configuration → Environment variables. */
const API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.SENDER_EMAIL || 'masi.k@aryaix.com';
const FROM_NAME = process.env.SENDER_NAME || 'Masi Komeili · AceAiX';
const SITE = (process.env.SITE_URL || 'https://aceaix.com').replace(/\/$/, '');

/** HTML-escape. Names arrive from a public form and end up inside markup. */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The email.
 *
 * Table layout and inline styles, because that is what email clients read —
 * a stylesheet is stripped by Gmail and `<div>` layout collapses in Outlook.
 *
 * Light ground rather than the site's dark one, deliberately. Dark emails are
 * inverted unpredictably by Gmail and Outlook in dark mode, and the result is
 * usually unreadable rather than merely different. The brand arrives through
 * the gradient band and the type instead, which survives everywhere. Outlook
 * ignores the gradient and gets the solid pink underneath it, which is why
 * `background-color` is set as well as `background-image`.
 */
function render({ name, fullName, isMinor, role, sport, city, country }) {
  /* An adult is greeted by their own name. A guardian is not: on the under-18
     path the form is filled in by the young athlete, who gives a parent's
     address — so the name on the submission is the child's, and opening "Hi
     Layla," to the parent would be addressing them by their child's name.
     Hence a plain "Hi," and the athlete named in the sentence instead. */
  const hi = !isMinor && name ? `Hi ${esc(name)},` : 'Hi,';

  const who = fullName ? esc(fullName) : 'A young athlete';
  const opening = isMinor
    ? `${who} has asked to hear when AceAiX opens, and gave your address because
       they are under 18. That is how it should be, and how it will stay — we
       will write to you, not to them.`
    : `Thank you for joining the early-access list for AceAiX.`;

  const detail = [
    role && `You told us you are ${role === 'club' ? 'a club or academy' : `a ${esc(role)}`}.`,
    sport && `Sport: ${esc(sport)}.`,
    [city, country].filter(Boolean).length &&
      `Based in ${esc([city, country].filter(Boolean).join(', '))}.`,
  ]
    .filter(Boolean)
    .join(' ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to AceAiX early access</title>
</head>
<body style="margin:0;padding:0;background:#F7F6FD;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F6FD;">
  <tr><td align="center" style="padding:28px 14px;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;
                  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

      <!-- Brand band. Outlook drops the gradient and keeps the solid colour. -->
      <tr><td style="background-color:#FF4E8C;
                     background-image:linear-gradient(105deg,#FF7A45 0%,#FF4E8C 52%,#E52C86 100%);
                     padding:26px 30px;">
        <span style="font-size:23px;font-weight:700;color:#ffffff;letter-spacing:-.2px;">AceAiX</span>
        <div style="margin-top:3px;font-size:12px;color:rgba(255,255,255,.88);
                    letter-spacing:1.4px;text-transform:uppercase;">Early access</div>
      </td></tr>

      <tr><td style="padding:30px 30px 8px;">
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#161327;font-weight:700;">
          You're on the list.
        </h1>
        <p style="margin:0 0 14px;font-size:15.5px;line-height:1.62;color:#3F3A57;">
          ${hi}
        </p>
        <p style="margin:0 0 14px;font-size:15.5px;line-height:1.62;color:#3F3A57;">
          ${opening}
        </p>
        ${
          detail
            ? `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#6B6588;">${detail}</p>`
            : ''
        }
        <p style="margin:0 0 14px;font-size:15.5px;line-height:1.62;color:#3F3A57;">
          AceAiX opens on <b style="color:#161327;">1 October 2026</b>. You will hear from
          us on that day, and not before it — one email, then nothing until there
          is something worth telling you.
        </p>
      </td></tr>

      <!-- What they are actually waiting for. A welcome that says only
           "thanks" gives somebody nothing to remember it by. -->
      <tr><td style="padding:6px 30px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#F7F6FD;border-radius:10px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-size:11.5px;letter-spacing:1.3px;text-transform:uppercase;
                        color:#847EA0;margin-bottom:10px;">What you get on day one</div>
            <p style="margin:0 0 8px;font-size:14.5px;line-height:1.55;color:#3F3A57;">
              A sporting profile that is yours — matches, clips, and a Talent Score
              built from five pillars rather than a follower count.
            </p>
            <p style="margin:0;font-size:14.5px;line-height:1.55;color:#3F3A57;">
              And the part that matters: coaches, scouts and clubs can find you.
              Verified ones. That is the whole point of it.
            </p>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:22px 30px 6px;">
        <p style="margin:0 0 4px;font-size:15.5px;line-height:1.62;color:#3F3A57;">
          See you on the first.
        </p>
      </td></tr>

      <!-- Signature -->
      <tr><td style="padding:10px 30px 26px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top:1px solid #E6E2F4;padding-top:16px;">
            <div style="font-size:15px;font-weight:700;color:#161327;">Masi Komeili</div>
            <div style="font-size:13.5px;color:#6B6588;margin-top:2px;">
              Head of Marketing &amp; Branding, AceAiX
            </div>
            <div style="font-size:13.5px;margin-top:6px;">
              <a href="mailto:masi.k@aryaix.com" style="color:#E0430F;text-decoration:none;">masi.k@aryaix.com</a>
            </div>
          </td></tr>
        </table>
      </td></tr>

    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:16px 12px 0;text-align:center;
                     font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                     font-size:12px;line-height:1.6;color:#847EA0;">
        You are getting this because you asked to hear when AceAiX opens.
        No adverts, no data selling.
        <a href="mailto:masi.k@aryaix.com?subject=Unsubscribe" style="color:#847EA0;">Unsubscribe</a>
        and you will not hear from us again.
        <div style="margin-top:8px;">AceAiX is a product of AryAiX FZ-LLC, Dubai.</div>
      </td></tr>
    </table>

  </td></tr>
</table>
</body>
</html>`;
}

/** Plain text, for clients that ask for it and for anybody who prefers it. */
function renderText({ name, fullName, isMinor }) {
  return [
    !isMinor && name ? `Hi ${name},` : 'Hi,',
    '',
    isMinor
      ? `${fullName || 'A young athlete'} has asked to hear when AceAiX opens, and gave your address because they are under 18. That is how it should be, and how it will stay — we will write to you, not to them.`
      : 'Thank you for joining the early-access list for AceAiX.',
    '',
    'AceAiX opens on 1 October 2026. You will hear from us on that day, and not before it.',
    '',
    'What you get on day one: a sporting profile that is yours — matches, clips, and a Talent Score built from five pillars rather than a follower count. And coaches, scouts and clubs can find you. Verified ones.',
    '',
    'See you on the first.',
    '',
    'Masi Komeili',
    'Head of Marketing & Branding, AceAiX',
    'masi.k@aryaix.com',
    '',
    '---',
    'You are getting this because you asked to hear when AceAiX opens. Reply with "unsubscribe" and you will not hear from us again.',
    'AceAiX is a product of AryAiX FZ-LLC, Dubai.',
  ].join('\n');
}

export default async (req) => {
  const ok = () => new Response('ok', { status: 200 });

  let payload;
  try {
    ({ payload } = await req.json());
  } catch {
    console.error('submission-created: body was not JSON');
    return ok();
  }

  const form = payload?.form_name;
  if (form !== 'early-access') {
    console.log(`submission-created: ignoring form "${form}"`);
    return ok();
  }

  const d = payload?.data ?? {};
  const to = String(d.email ?? '').trim();
  if (!to || !to.includes('@')) {
    console.error('submission-created: no usable email on the submission');
    return ok();
  }

  if (!API_KEY) {
    /* Loud in the log, silent to the person. Without the key nothing can be
       sent, and that is a setup step somebody forgot rather than a bug. */
    console.error(
      'submission-created: BREVO_API_KEY is not set, so no reply was sent. ' +
        'Set it under Site configuration → Environment variables.',
    );
    return ok();
  }

  /* The age field is written out in words by the form, on purpose, so that a
     person reading the notification is not left interpreting `false`. */
  const isMinor = /under 18/i.test(String(d.age ?? ''));

  const first = String(d.first_name ?? '').trim();
  const last = String(d.last_name ?? '').trim();

  const fields = {
    name: first,
    fullName: [first, last].filter(Boolean).join(' '),
    isMinor,
    role: (d.role ?? '').trim(),
    sport: (d.sport ?? '').trim(),
    city: (d.city ?? '').trim(),
    country: (d.country ?? '').trim(),
  };

  const body = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    replyTo: { email: FROM_EMAIL, name: 'Masi Komeili' },
    /* The display name on an under-18 submission belongs to the child, not to
       the parent whose inbox this lands in, so it is not attached to the
       recipient there. */
    to: [{ email: to, ...(!isMinor && fields.fullName ? { name: fields.fullName } : {}) }],
    subject: isMinor
      ? fields.fullName
        ? `${fields.fullName} is on the AceAiX early-access list`
        : 'Your young athlete is on the AceAiX early-access list'
      : "You're on the AceAiX early-access list",
    htmlContent: render(fields),
    textContent: renderText(fields),
    tags: ['early-access', isMinor ? 'guardian' : 'adult'],
  };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      /* Brevo says why in the body, and it is usually one of two things: the
         sender address is not verified, or the key is wrong. Both are worth
         reading rather than guessing at. */
      console.error(`submission-created: Brevo returned ${res.status} — ${await res.text()}`);
    } else {
      console.log(`submission-created: reply sent to ${to}`);
    }
  } catch (err) {
    console.error(`submission-created: could not reach Brevo — ${err.message}`);
  }

  return ok();
};
