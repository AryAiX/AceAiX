import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Guardian consent — the whole flow in one function.
 *
 *   POST { consent_id }        (authenticated as the minor)
 *        → e-mails the guardian a one-time link
 *
 *   GET  ?token=…              (opened by the guardian from that e-mail)
 *        → renders the consent page
 *
 *   POST form-encoded          (submitted from that page)
 *        → records the decision via public.confirm_guardian_consent
 *
 * Serving the page from here means the flow works the moment the function is
 * deployed — it does not wait on the marketing site being live.
 *
 * Environment:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (provided by the platform)
 *   RESEND_API_KEY                            (optional — without it the link
 *                                              is returned in the response so
 *                                              it can be sent by hand)
 *   CONSENT_FROM_EMAIL                        (default: AceAiX <safety@aceaix.com>)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM = Deno.env.get("CONSENT_FROM_EMAIL") ?? "AceAiX <safety@aceaix.com>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" },
  });
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function consentUrl(token: string): string {
  return `${SUPABASE_URL}/functions/v1/guardian-consent?token=${encodeURIComponent(token)}`;
}

// ── The page the guardian sees ───────────────────────────────────────────────
function page(inner: string, title = "AceAiX — Parent or guardian approval"): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escape(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; background:#F6F6F3; color:#14161A;
         font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 32px 20px 64px; }
  .brand { font-weight:800; letter-spacing:-0.3px; font-size:20px; margin-bottom:28px; }
  .brand span { color:#F04E12; }
  .card { background:#fff; border:1px solid #E4E4DE; border-radius:20px; padding:24px; }
  h1 { font-size:24px; line-height:1.25; margin:0 0 12px; }
  h2 { font-size:15px; margin:24px 0 8px; }
  p { margin:0 0 14px; color:#4F545D; }
  ul { color:#4F545D; padding-left:20px; margin:0 0 14px; }
  li { margin-bottom:6px; }
  label { display:flex; gap:12px; align-items:flex-start; padding:14px 0;
          border-bottom:1px solid #EDEDE8; cursor:pointer; }
  label:last-of-type { border-bottom:0; }
  label input { margin-top:3px; width:20px; height:20px; accent-color:#F04E12; }
  .opt-title { font-weight:600; color:#14161A; display:block; }
  .opt-body { font-size:14px; color:#868C96; }
  button { width:100%; border:0; border-radius:999px; padding:16px; font-size:16px;
           font-weight:600; cursor:pointer; margin-top:20px; }
  .primary { background:#F04E12; color:#fff; }
  .ghost { background:transparent; color:#868C96; margin-top:8px; }
  .foot { font-size:13px; color:#868C96; margin-top:24px; text-align:center; }
  .foot a { color:#868C96; }
  .ok { font-size:44px; line-height:1; margin-bottom:12px; }
</style></head>
<body><div class="wrap">
  <div class="brand">Ace<span>AiX</span></div>
  <div class="card">${inner}</div>
  <p class="foot">
    AryAiX · Dilan Tower, Al Jadaf, Dubai, United Arab Emirates<br>
    Questions? <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>
  </p>
</div></body></html>`;
}

function decisionForm(token: string, childName: string, guardianName: string): string {
  return `
  <h1>${escape(guardianName || "Hello")} — ${escape(childName)} would like your approval</h1>
  <p>${escape(childName)} has created an AceAiX profile. AceAiX is where young athletes
     build a sporting profile and are found by coaches and clubs.</p>
  <p>Because they are under 18, nothing happens until you say so. Their profile is
     currently <strong>hidden</strong> and nobody can message them.</p>

  <h2>What you are approving</h2>
  <form method="POST" action="${escape(consentUrl(token))}">
    <input type="hidden" name="token" value="${escape(token)}">

    <label>
      <input type="checkbox" name="allow_discovery" value="1" checked>
      <span>
        <span class="opt-title">Let coaches and clubs find them</span>
        <span class="opt-body">Their profile can appear in searches by verified coaches,
        clubs and academies. Their exact age and date of birth are never shown.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_messaging" value="1" checked>
      <span>
        <span class="opt-title">Let verified coaches and clubs message them</span>
        <span class="opt-body">Only accounts AceAiX has verified can start a conversation.
        Other adults cannot message them at all.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_media" value="1" checked>
      <span>
        <span class="opt-title">Let them share photos and clips</span>
        <span class="opt-body">Highlights and posts they choose to publish.</span>
      </span>
    </label>

    <button class="primary" type="submit" name="decision" value="approve">Approve</button>
    <button class="ghost" type="submit" name="decision" value="decline">Not right now</button>
  </form>

  <p class="opt-body" style="margin-top:18px">
    You can change or withdraw this at any time by e-mailing
    <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>, or from inside the app.
    Read our <a href="https://aceaix.com/privacy">Privacy Policy</a> and
    <a href="https://aceaix.com/child-safety">Child Safety Standards</a>.
  </p>`;
}

// ── E-mail ───────────────────────────────────────────────────────────────────
async function sendEmail(to: string, guardianName: string, childName: string, token: string) {
  const link = consentUrl(token);

  if (!RESEND_KEY) {
    // Not configured: hand the link back so it can be delivered another way
    // rather than silently dropping a consent request on the floor.
    return { sent: false, link };
  }

  const body = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                max-width:520px;margin:0 auto;padding:24px;color:#14161A">
      <div style="font-weight:800;font-size:20px;margin-bottom:24px">Ace<span style="color:#F04E12">AiX</span></div>
      <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">
        ${escape(childName)} needs your approval
      </h1>
      <p style="color:#4F545D;line-height:1.55">
        ${escape(guardianName || "Hello")}, ${escape(childName)} has created a profile on AceAiX,
        where young athletes are discovered by coaches and clubs.
      </p>
      <p style="color:#4F545D;line-height:1.55">
        Because they are under 18, their profile is hidden and nobody can message them until a
        parent or guardian approves it. Please review what you would be approving:
      </p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#F04E12;color:#fff;text-decoration:none;
           padding:14px 28px;border-radius:999px;font-weight:600;display:inline-block">
          Review and decide
        </a>
      </p>
      <p style="color:#868C96;font-size:13px;line-height:1.5">
        This link works once and expires in 14 days. If you were not expecting this e-mail,
        you can ignore it — nothing will change.
      </p>
      <hr style="border:0;border-top:1px solid #E4E4DE;margin:28px 0">
      <p style="color:#868C96;font-size:12px;line-height:1.5">
        AryAiX · Dilan Tower, Al Jadaf, Dubai, United Arab Emirates<br>
        Questions about a young person's safety? <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>
      </p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: `${childName} needs your approval on AceAiX`,
      html: body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Email delivery failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  return { sent: true, link };
}

// ── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Guardian consent service is not configured" }, 500);
  }

  const url = new URL(req.url);

  // ---- The guardian opening the link ----
  if (req.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) return html(page("<h1>That link is not valid.</h1>"), 400);

    const { data: consent } = await admin
      .from("guardian_consents")
      .select("id, status, guardian_name, minor_user_id, token_expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!consent) {
      return html(
        page(`<h1>That link is not valid</h1>
          <p>It may already have been used. If you need a new one, ask your child to
          resend it from the AceAiX app, or contact
          <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>.</p>`),
        404,
      );
    }
    if (consent.status !== "pending") {
      return html(
        page(`<h1>This request has already been answered</h1>
          <p>Nothing further is needed. To change your decision, e-mail
          <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>.</p>`),
      );
    }
    if (new Date(consent.token_expires_at).getTime() < Date.now()) {
      return html(
        page(`<h1>This link has expired</h1>
          <p>Ask your child to send a new request from the AceAiX app.</p>`),
        410,
      );
    }

    const { data: child } = await admin
      .from("user_profiles")
      .select("full_name")
      .eq("id", consent.minor_user_id)
      .maybeSingle();

    return html(
      page(decisionForm(token, child?.full_name ?? "Your child", consent.guardian_name ?? "")),
    );
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const contentType = req.headers.get("content-type") ?? "";

  // ---- The guardian submitting the form ----
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const token = String(form.get("token") ?? "");
    const decision = String(form.get("decision") ?? "approve");

    if (decision === "decline") {
      await admin
        .from("guardian_consents")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("token", token)
        .eq("status", "pending");

      return html(
        page(`<div class="ok">✓</div>
          <h1>Thank you — nothing has been shared</h1>
          <p>Their profile stays hidden and nobody can message them. They can ask
          again later if you change your mind.</p>`),
      );
    }

    const { data, error } = await admin.rpc("confirm_guardian_consent", {
      p_token: token,
      p_allow_discovery: form.get("allow_discovery") === "1",
      p_allow_messaging: form.get("allow_messaging") === "1",
      p_allow_media: form.get("allow_media") === "1",
    });

    if (error || !data?.ok) {
      return html(
        page(`<h1>We couldn't record that</h1>
          <p>The link may have expired or already been used. Contact
          <a href="mailto:safety@aceaix.com">safety@aceaix.com</a> and we will help.</p>`),
        400,
      );
    }

    return html(
      page(`<div class="ok">✓</div>
        <h1>Approved — thank you</h1>
        <p>Their profile is now visible to verified coaches and clubs, with the
        permissions you chose.</p>
        <p>You can change or withdraw this at any time by e-mailing
        <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>. We will always
        act on a parent or guardian's request.</p>`),
    );
  }

  // ---- The app asking us to send (or resend) the e-mail ----
  let payload: { consent_id?: string; resend?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.consent_id) return json({ error: "consent_id is required" }, 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not authenticated" }, 401);

  const { data: caller } = await admin.auth.getUser(jwt);
  if (!caller?.user) return json({ error: "Not authenticated" }, 401);

  const { data: consent, error } = await admin
    .from("guardian_consents")
    .select("id, minor_user_id, guardian_name, guardian_email, token, status")
    .eq("id", payload.consent_id)
    .maybeSingle();

  if (error || !consent) return json({ error: "Consent request not found" }, 404);

  // Only the young person the request belongs to may trigger delivery.
  if (consent.minor_user_id !== caller.user.id) {
    return json({ error: "Not allowed" }, 403);
  }
  if (consent.status !== "pending") {
    return json({ error: "This request has already been answered" }, 409);
  }

  const { data: child } = await admin
    .from("user_profiles")
    .select("full_name")
    .eq("id", consent.minor_user_id)
    .maybeSingle();

  try {
    const result = await sendEmail(
      consent.guardian_email,
      consent.guardian_name ?? "",
      child?.full_name ?? "Your child",
      consent.token,
    );
    return json({ ok: true, ...result });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Could not send the e-mail" }, 502);
  }
});
