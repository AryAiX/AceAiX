#!/usr/bin/env node
/**
 * Builds the Supabase Auth email templates in the AceAiX theme and, with
 * `--push`, uploads them to a project through the Management API.
 *
 *   node tools/auth-emails/build.mjs                       # write supabase/templates/*.html
 *   node tools/auth-emails/build.mjs --push <project-ref>  # ...and push to that project
 *
 * The push needs SUPABASE_ACCESS_TOKEN (a personal access token). It also
 * uploads the logo to the project's public `brand` bucket (migration
 * 20260928000001) so the image keeps resolving for as long as the email sits
 * in an inbox; the websites can't be relied on for that.
 *
 * Template variables ({{ .ConfirmationURL }} and friends) are Go template
 * expressions that Supabase fills in when it sends the mail; they pass
 * through here untouched. Everything is table-based inline CSS because that
 * is what Gmail, Outlook and Apple Mail agree on.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '../../supabase/templates');
const logoFile = join(here, '../../web/public/aceaix-mark.png');
const LOGO_OBJECT = 'brand/aceaix-mark.png';

const args = process.argv.slice(2);
const projectRef = args[0] === '--push' ? args[1] : 'uvjxrimfijxmnjnbrivg';
if (args[0] === '--push' && !projectRef) throw new Error('usage: build.mjs --push <project-ref>');
const logoUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${LOGO_OBJECT}`;

// Palette: mobile/theme/tokens.ts (light palette + action gradient).
const C = {
  bg: '#F1EFFB',
  card: '#FFFFFF',
  ink: '#161327',
  inkSecondary: '#514C6B',
  inkMuted: '#847EA0',
  border: '#E9E6F7',
  primary: '#F5451B',
  gradientA: '#FF6A2C',
  gradientB: '#FF3D7F',
  codeBg: '#0F0D1C',
};

const COMPANY = {
  name: 'AceAiX',
  legalName: 'AryAiX',
  address: 'Dilan Tower, Al Jadaf, Dubai, United Arab Emirates',
  supportEmail: 'support@aceaix.com',
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** One email. `button` renders the gradient CTA; `code` renders a one-time code. */
function layout({ preheader, title, lead, button, code, note, footnote }) {
  const cta = button
    ? `
      <tr>
        <td align="left" style="padding:28px 0 8px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${button.href}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="50%" fillcolor="${C.primary}" stroke="f">
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${button.label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${button.href}" target="_blank"
             style="display:inline-block;background:${C.primary};background-image:linear-gradient(90deg,${C.gradientA} 0%,${C.gradientB} 100%);color:#ffffff;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:700;line-height:52px;height:52px;padding:0 36px;border-radius:26px;mso-hide:all;">
            ${button.label}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.inkMuted};">
          If the button doesn't work, copy this link into your browser:<br>
          <a href="${button.href}" style="color:${C.primary};text-decoration:underline;word-break:break-all;">${button.href}</a>
        </td>
      </tr>`
    : '';

  const otp = code
    ? `
      <tr>
        <td align="left" style="padding:28px 0 8px 0;">
          <div style="display:inline-block;background:${C.codeBg};color:#ffffff;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;line-height:64px;padding:0 20px 0 30px;border-radius:16px;">${code}</div>
        </td>
      </tr>`
    : '';

  return render(`<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
    a { color:${C.primary}; }
    @media only screen and (max-width: 620px) {
      .container { width:100% !important; }
      .card { padding:28px 22px !important; }
      h1 { font-size:24px !important; line-height:30px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
    <tr>
      <td align="center" style="padding:32px 16px 40px 16px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">

          <!-- Brand -->
          <tr>
            <td align="left" style="padding:0 4px 20px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <img src="${logoUrl}" width="44" height="29" alt="" style="display:block;width:44px;height:29px;border:0;">
                  </td>
                  <td valign="middle" style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.3px;color:${C.ink};">
                    Ace<span style="color:${C.primary};">AiX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="card" style="background:${C.card};border-radius:24px;padding:40px 40px 36px 40px;border:1px solid ${C.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 4px 0;">
                    <div style="display:inline-block;width:44px;height:5px;border-radius:3px;background:${C.primary};background-image:linear-gradient(90deg,${C.gradientA} 0%,${C.gradientB} 100%);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0 0;">
                    <h1 style="margin:0;font-family:${FONT};font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${C.ink};">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0 0;font-family:${FONT};font-size:16px;line-height:25px;color:${C.inkSecondary};">
                    ${lead}
                  </td>
                </tr>
                ${cta}
                ${otp}
                ${
                  note
                    ? `<tr>
                  <td style="padding:24px 0 0 0;font-family:${FONT};font-size:14px;line-height:22px;color:${C.inkSecondary};">
                    ${note}
                  </td>
                </tr>`
                    : ''
                }
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="left" style="padding:24px 8px 0 8px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.inkMuted};">
              ${footnote ?? 'You received this email because this address was used to create or manage an AceAiX account.'}<br>
              Questions? Write to <a href="mailto:${COMPANY.supportEmail}" style="color:${C.inkMuted};text-decoration:underline;">${COMPANY.supportEmail}</a>.<br><br>
              © ${new Date().getFullYear()} ${COMPANY.legalName} · ${COMPANY.address}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`);
}

/** Strips trailing whitespace and collapses blank runs left by empty template slots. */
function render(html) {
  return html
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

const SECURITY_NOTE =
  "If you didn't make this change, <a href=\"{{ .SiteURL }}/reset-password\">reset your password</a> right away and let us know at " +
  `<a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a>.`;

/**
 * Keyed by the Management API field prefix: `mailer_subjects_<key>` and
 * `mailer_templates_<key>_content`.
 */
export const EMAILS = {
  confirmation: {
    subject: 'Confirm your email to get on the court',
    file: 'confirmation.html',
    html: layout({
      preheader: 'One tap and your AceAiX account is ready.',
      title: 'Welcome to AceAiX',
      lead: 'Tap the button to confirm this email address and finish setting up your account. Then come back to the app and sign in.',
      button: { label: 'Confirm my email', href: '{{ .ConfirmationURL }}' },
      note: "This link expires in 24 hours and can be used once. If you didn't create an AceAiX account, you can safely ignore this email.",
    }),
  },
  recovery: {
    subject: 'Reset your AceAiX password',
    file: 'recovery.html',
    html: layout({
      preheader: 'Choose a new password for your account.',
      title: 'Reset your password',
      lead: 'We got a request to reset the password for your AceAiX account. Tap the button to choose a new one.',
      button: { label: 'Choose a new password', href: '{{ .ConfirmationURL }}' },
      note: "This link expires in one hour. If you didn't ask for a reset, ignore this email — your password stays the same.",
    }),
  },
  magic_link: {
    subject: 'Your AceAiX sign-in link',
    file: 'magic_link.html',
    html: layout({
      preheader: 'Tap to sign in. The link works once.',
      title: 'Sign in to AceAiX',
      lead: 'Tap the button to sign in. The link expires shortly and works only once.',
      button: { label: 'Sign in', href: '{{ .ConfirmationURL }}' },
      note: "If you didn't request this, you can safely ignore this email.",
    }),
  },
  email_change: {
    subject: 'Confirm your new email address',
    file: 'email_change.html',
    html: layout({
      preheader: 'Confirm {{ .NewEmail }} as your new AceAiX email.',
      title: 'Confirm your new email',
      lead: 'Tap the button to confirm <strong style="color:#161327;">{{ .NewEmail }}</strong> as the new email address for your AceAiX account.',
      button: { label: 'Confirm new email', href: '{{ .ConfirmationURL }}' },
      note: "If you didn't request this change, you can safely ignore this email.",
    }),
  },
  invite: {
    subject: "You're invited to AceAiX",
    file: 'invite.html',
    html: layout({
      preheader: 'Create your AceAiX account.',
      title: "You're invited",
      lead: "You've been invited to join AceAiX, where athletes get discovered. Tap the button to accept and create your account.",
      button: { label: 'Accept invitation', href: '{{ .ConfirmationURL }}' },
      note: "If you weren't expecting an invitation, you can safely ignore this email.",
    }),
  },
  reauthentication: {
    subject: '{{ .Token }} is your AceAiX verification code',
    file: 'reauthentication.html',
    html: layout({
      preheader: 'Your verification code is {{ .Token }}.',
      title: 'Your verification code',
      lead: 'Enter this code in the app to confirm it’s you. It expires shortly.',
      code: '{{ .Token }}',
      note: "If you didn't request a code, you can safely ignore this email.",
    }),
  },
  password_changed_notification: {
    subject: 'Your AceAiX password was changed',
    file: 'password_changed_notification.html',
    html: layout({
      preheader: 'The password for your AceAiX account was just changed.',
      title: 'Your password was changed',
      lead: 'The password for your AceAiX account was changed just now. No action is needed if that was you.',
      note: SECURITY_NOTE,
    }),
  },
  email_changed_notification: {
    subject: 'Your AceAiX email address was changed',
    file: 'email_changed_notification.html',
    html: layout({
      preheader: 'The email on your AceAiX account was changed.',
      title: 'Your email address was changed',
      lead: 'The email address for your AceAiX account was changed from <strong style="color:#161327;">{{ .OldEmail }}</strong> to <strong style="color:#161327;">{{ .Email }}</strong>.',
      note: SECURITY_NOTE,
    }),
  },
  identity_linked_notification: {
    subject: 'A new sign-in method was added to AceAiX',
    file: 'identity_linked_notification.html',
    html: layout({
      preheader: 'A new sign-in method was linked to your account.',
      title: 'New sign-in method linked',
      lead: 'Your {{ .Provider }} account was linked as a sign-in method for <strong style="color:#161327;">{{ .Email }}</strong>.',
      note: SECURITY_NOTE,
    }),
  },
};

function build() {
  mkdirSync(outDir, { recursive: true });
  for (const [key, email] of Object.entries(EMAILS)) {
    writeFileSync(join(outDir, email.file), email.html);
    console.log(`wrote supabase/templates/${email.file}  (${key})`);
  }
}

/** Uploads the logo with the project's service-role key, fetched for this call only. */
async function uploadLogo(ref, token) {
  const keysRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!keysRes.ok) throw new Error(`api-keys failed: ${keysRes.status} ${await keysRes.text()}`);
  const serviceKey = (await keysRes.json()).find((k) => k.name === 'service_role')?.api_key;
  if (!serviceKey) throw new Error('service_role key not found');

  const res = await fetch(`https://${ref}.supabase.co/storage/v1/object/${LOGO_OBJECT}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
      'Cache-Control': 'public, max-age=31536000',
    },
    body: readFileSync(logoFile),
  });
  if (!res.ok) throw new Error(`logo upload failed: ${res.status} ${await res.text()}`);

  const check = await fetch(logoUrl, { method: 'HEAD' });
  if (!check.ok || !check.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`logo not readable at ${logoUrl} (${check.status})`);
  }
  console.log(`logo at ${logoUrl}`);
}

async function push(ref) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is not set');
  await uploadLogo(ref, token);
  const body = {};
  for (const [key, email] of Object.entries(EMAILS)) {
    body[`mailer_subjects_${key}`] = email.subject;
    body[`mailer_templates_${key}_content`] = email.html;
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`push failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  console.log(`pushed ${Object.keys(EMAILS).length} templates to ${ref}`);
  console.log(`  confirmation subject: ${json.mailer_subjects_confirmation}`);
}

build();
if (args[0] === '--push') await push(projectRef);
