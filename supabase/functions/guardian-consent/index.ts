import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Guardian consent — the whole flow in one function.
 *
 *   POST { consent_id }        (authenticated as the minor)
 *        → e-mails the guardian a one-time link. The link still points at
 *          this function. There is no `decision` field on this body.
 *
 *   GET  ?token=…
 *        → ?format=json: the page as data, and nothing more
 *             { state: pending | answered | expired | invalid,
 *               child_name,   // the name the HTML page shows, or null
 *               options }     // checkbox defaults, or null when there is no form
 *          Status codes match the HTML: 400 missing token, 404 unknown token,
 *          200 already answered, 410 expired, 200 pending.
 *        → CONSENT_PAGE_URL set, and format is not json: 302 to
 *          CONSENT_PAGE_URL?token=<token>, so emails already sent still open
 *          the approval page.
 *        → otherwise: today's HTML page.
 *
 *   POST JSON { token, decision: "approve" | "decline", allow_* }
 *        → the guardian's decision. No JWT — the token is the credential,
 *          same as the form. `decision` is what tells this apart from the
 *          minor's { consent_id } post above.
 *        → decline sets the row to revoked; approve calls
 *          confirm_guardian_consent with the same booleans as the form.
 *          Only JSON true counts as a ticked box.
 *        → { ok, state } with the form's status codes.
 *          state: granted | revoked | expired | invalid
 *
 *   POST form-encoded          (submitted from the HTML fallback)
 *        → the same decision, rendered as HTML
 *
 * Supabase rewrites text/html from *.supabase.co functions to text/plain, so
 * the live page is the Expo route named by CONSENT_PAGE_URL. The HTML here
 * remains for local use and for when that URL is not set.
 *
 * Environment:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (provided by the platform)
 *   RESEND_API_KEY                            (required for delivery)
 *   CONSENT_FROM_EMAIL                        (default: AceAiX <safety@aceaix.com>)
 *   CONSENT_PAGE_URL                          (e.g. https://app.aceaix.com/parent-approval)
 *                                             Leave unset until that route is deployed.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, X-Application-Name, Apikey",
};

const FROM = Deno.env.get("CONSENT_FROM_EMAIL") ?? "AceAiX <safety@aceaix.com>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const CONSENT_PAGE_URL = (Deno.env.get("CONSENT_PAGE_URL") ?? "").trim();

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

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { ...CORS, Location: location },
  });
}

/** Absolute page URL with the guardian token, or null when unset or unusable. */
function consentPageLocation(token: string | null): string | null {
  if (!CONSENT_PAGE_URL) return null;
  try {
    const target = new URL(CONSENT_PAGE_URL);
    if (token) target.searchParams.set("token", token);
    return target.toString();
  } catch (err) {
    console.error("CONSENT_PAGE_URL is not an absolute URL:", err);
    return null;
  }
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

/** What the guardian already approved, when this request adds to a live consent. */
interface CurrentScopes {
  allow_discovery: boolean;
  allow_messaging: boolean;
  allow_media: boolean;
  allow_assessments: boolean;
  allow_sponsorship: boolean;
  allow_bookings: boolean;
}

/*
 * A request can arrive while this guardian's earlier approval is still in
 * force — a minor asking to add the Game Intelligence games, say. Submitting
 * the form replaces that approval, so the boxes must start as the guardian
 * left them. Pre-ticking
 * everything would quietly re-grant a scope the guardian had refused.
 */
/** First-visit checkbox defaults. A returning guardian's grants replace these. */
const FRESH_OPTIONS: CurrentScopes = {
  allow_discovery: true,
  allow_messaging: true,
  allow_media: true,
  allow_assessments: false,
  allow_sponsorship: false,
  allow_bookings: false,
};

function checkboxOptions(current: CurrentScopes | null): CurrentScopes {
  if (!current) return { ...FRESH_OPTIONS };
  return {
    allow_discovery: Boolean(current.allow_discovery),
    allow_messaging: Boolean(current.allow_messaging),
    allow_media: Boolean(current.allow_media),
    allow_assessments: Boolean(current.allow_assessments),
    allow_sponsorship: Boolean(current.allow_sponsorship),
    allow_bookings: Boolean(current.allow_bookings),
  };
}

function decisionForm(
  token: string,
  childName: string,
  guardianName: string,
  options: CurrentScopes,
  reviewing: boolean,
): string {
  const on = (scope: keyof CurrentScopes) => (options[scope] ? "checked" : "");
  const intro = reviewing
    ? `<p>${escape(childName)} is asking you to review what you approved on AceAiX. The boxes
       below show your current choices — change only what you want to change.</p>`
    : `<p>Because they are under 18, nothing happens until you say so. Their profile is
     currently <strong>hidden</strong> and nobody can message them.</p>`;
  return `
  <h1>${escape(guardianName || "Hello")} — ${escape(childName)} would like your approval</h1>
  <p>${escape(childName)} has created an AceAiX profile. AceAiX is where young athletes
     build a sporting profile and are found by coaches and clubs.</p>
  ${intro}

  <h2>What you are approving</h2>
  <form method="POST" action="${escape(consentUrl(token))}">
    <input type="hidden" name="token" value="${escape(token)}">

    <label>
      <input type="checkbox" name="allow_discovery" value="1" ${on("allow_discovery")}>
      <span>
        <span class="opt-title">Let coaches and clubs find them</span>
        <span class="opt-body">Their profile can appear in searches by verified coaches,
        clubs and academies. Their exact age and date of birth are never shown.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_messaging" value="1" ${on("allow_messaging")}>
      <span>
        <span class="opt-title">Let verified coaches and clubs message them</span>
        <span class="opt-body">Only accounts AceAiX has verified can start a conversation.
        Other adults cannot message them at all.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_media" value="1" ${on("allow_media")}>
      <span>
        <span class="opt-title">Let them share photos and clips</span>
        <span class="opt-body">Highlights and posts they choose to publish.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_assessments" value="1" ${on("allow_assessments")}>
      <span>
        <span class="opt-title">Let them take the Game Intelligence games</span>
        <span class="opt-body">Short timed games that measure reaction, focus and football
        decision-making. Results stay private unless they choose to share them with clubs.
        Not a medical or psychological assessment.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_sponsorship" value="1" ${on("allow_sponsorship")}>
      <span>
        <span class="opt-title">Let them ask for and accept sponsorship</span>
        <span class="opt-body">They can ask companies to back a tournament or a season, and apply to
        sponsors' calls. Only sponsors AceAiX has verified can make them an offer, and a sponsor cannot
        message them directly. No money moves through AceAiX: any agreement and payment is yours to
        make with the sponsor.</span>
      </span>
    </label>

    <label>
      <input type="checkbox" name="allow_bookings" value="1" ${on("allow_bookings")}>
      <span>
        <span class="opt-title">Let them book sessions with verified coaches</span>
        <span class="opt-body">They can book a training session, a consultation or a class from a
        coach's calendar, and see where it takes place. Only coaches AceAiX has verified. You are
        told about every booking if you have an AceAiX account, and you can cancel one. Payment, if
        any, is made to the coach directly.</span>
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
    // The link is a bearer credential that grants consent. Returning it to the
    // minor would let them approve their own request.
    throw new Error("Guardian consent email delivery is not configured");
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
  return { sent: true };
}

// ── What the page shows ──────────────────────────────────────────────────────
type ConsentState = "pending" | "answered" | "expired" | "invalid";

interface ConsentView {
  status: number;
  state: ConsentState;
  /** The name the HTML heading uses. Null when that page shows no name. */
  childName: string | null;
  guardianName: string;
  options: CurrentScopes | null;
  reviewing: boolean;
  token: string;
  invalidHtml: "missing" | "unknown" | null;
}

async function describeConsent(token: string | null): Promise<ConsentView> {
  const empty = (status: number, state: ConsentState, invalidHtml: ConsentView["invalidHtml"]): ConsentView => ({
    status,
    state,
    childName: null,
    guardianName: "",
    options: null,
    reviewing: false,
    token: token ?? "",
    invalidHtml,
  });

  if (!token) return empty(400, "invalid", "missing");

  const { data: consent } = await admin
    .from("guardian_consents")
    .select("id, status, guardian_name, guardian_email, minor_user_id, token_expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!consent) return empty(404, "invalid", "unknown");
  if (consent.status !== "pending") return empty(200, "answered", null);
  if (new Date(consent.token_expires_at).getTime() < Date.now()) {
    return empty(410, "expired", null);
  }

  const { data: child } = await admin
    .from("user_profiles")
    .select("full_name")
    .eq("id", consent.minor_user_id)
    .maybeSingle();

  /* This guardian's own live approval, if any — submitting replaces it
     (confirm_guardian_consent, 1006/02). Another guardian's is not theirs
     to see or change. */
  const { data: current } = await admin
    .from("guardian_consents")
    .select("allow_discovery, allow_messaging, allow_media, allow_assessments, allow_sponsorship, allow_bookings")
    .eq("minor_user_id", consent.minor_user_id)
    .eq("guardian_email", consent.guardian_email)
    .eq("status", "granted")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prior = (current as CurrentScopes | null) ?? null;
  return {
    status: 200,
    state: "pending",
    childName: child?.full_name ?? "Your child",
    guardianName: consent.guardian_name ?? "",
    options: checkboxOptions(prior),
    reviewing: prior !== null,
    token,
    invalidHtml: null,
  };
}

function consentJson(view: ConsentView): Response {
  return json(
    {
      state: view.state,
      child_name: view.childName,
      options: view.options,
    },
    view.status,
  );
}

function consentPageHtml(view: ConsentView): Response {
  if (view.invalidHtml === "missing") {
    return html(page("<h1>That link is not valid.</h1>"), view.status);
  }
  if (view.invalidHtml === "unknown") {
    return html(
      page(`<h1>That link is not valid</h1>
          <p>It may already have been used. If you need a new one, ask your child to
          resend it from the AceAiX app, or contact
          <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>.</p>`),
      view.status,
    );
  }
  if (view.state === "answered") {
    return html(
      page(`<h1>This request has already been answered</h1>
          <p>Nothing further is needed. To change your decision, e-mail
          <a href="mailto:safety@aceaix.com">safety@aceaix.com</a>.</p>`),
      view.status,
    );
  }
  if (view.state === "expired") {
    return html(
      page(`<h1>This link has expired</h1>
          <p>Ask your child to send a new request from the AceAiX app.</p>`),
      view.status,
    );
  }
  return html(
    page(
      decisionForm(
        view.token,
        view.childName ?? "Your child",
        view.guardianName,
        view.options ?? checkboxOptions(null),
        view.reviewing,
      ),
    ),
    view.status,
  );
}

// ── Recording the guardian's decision (form and JSON share this) ─────────────
interface DecisionInput {
  token: string;
  decision: string;
  allow_discovery: boolean;
  allow_messaging: boolean;
  allow_media: boolean;
  allow_assessments: boolean;
  allow_sponsorship: boolean;
  allow_bookings: boolean;
}

interface DecisionOutcome {
  ok: boolean;
  state: "granted" | "revoked" | "expired" | "invalid";
  status: 200 | 400 | 500;
}

async function recordDecision(input: DecisionInput): Promise<DecisionOutcome> {
  if (input.decision === "decline") {
    const { data: pending } = await admin
      .from("guardian_consents")
      .select("id, token_expires_at")
      .eq("token", input.token)
      .eq("status", "pending")
      .maybeSingle();
    if (!pending) return { ok: false, state: "invalid", status: 400 };
    if (new Date(pending.token_expires_at).getTime() < Date.now()) {
      return { ok: false, state: "expired", status: 400 };
    }

    const { error: declineError } = await admin
      .from("guardian_consents")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", pending.id)
      .eq("status", "pending");
    if (declineError) return { ok: false, state: "invalid", status: 500 };
    return { ok: true, state: "revoked", status: 200 };
  }

  const { data, error } = await admin.rpc("confirm_guardian_consent", {
    p_token: input.token,
    p_allow_discovery: input.allow_discovery,
    p_allow_messaging: input.allow_messaging,
    p_allow_media: input.allow_media,
    p_allow_assessments: input.allow_assessments,
    p_allow_sponsorship: input.allow_sponsorship,
    p_allow_bookings: input.allow_bookings,
  });

  if (error || !data?.ok) {
    const state = data?.error === "token_expired" ? "expired" : "invalid";
    return { ok: false, state, status: 400 };
  }
  return { ok: true, state: "granted", status: 200 };
}

function decisionHtml(outcome: DecisionOutcome): Response {
  if (!outcome.ok) {
    if (outcome.status === 500) {
      return html(page("<h1>We couldn't record that</h1><p>Please try again.</p>"), 500);
    }
    return html(
      page(`<h1>We couldn't record that</h1>
            <p>The link may have expired or already been used. Contact
            <a href="mailto:safety@aceaix.com">safety@aceaix.com</a> and we will help.</p>`),
      outcome.status,
    );
  }
  if (outcome.state === "revoked") {
    return html(
      page(`<div class="ok">✓</div>
          <h1>Thank you — nothing has been shared</h1>
          <p>Their profile stays hidden and nobody can message them. They can ask
          again later if you change your mind.</p>`),
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

/** JSON true is a ticked box. Anything else, including a missing field, is not. */
function optedIn(value: unknown): boolean {
  return value === true;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
    const wantsJson = url.searchParams.get("format") === "json";
    if (!wantsJson) {
      const location = consentPageLocation(token);
      if (location) return redirect(location);
    }
    const view = await describeConsent(token);
    return wantsJson ? consentJson(view) : consentPageHtml(view);
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const contentType = req.headers.get("content-type") ?? "";

  // ---- The guardian submitting the HTML form ----
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const outcome = await recordDecision({
      token: String(form.get("token") ?? ""),
      decision: String(form.get("decision") ?? "approve"),
      allow_discovery: form.get("allow_discovery") === "1",
      allow_messaging: form.get("allow_messaging") === "1",
      allow_media: form.get("allow_media") === "1",
      allow_assessments: form.get("allow_assessments") === "1",
      allow_sponsorship: form.get("allow_sponsorship") === "1",
      allow_bookings: form.get("allow_bookings") === "1",
    });
    return decisionHtml(outcome);
  }

  // ---- JSON: either the guardian's decision, or the minor asking to send ----
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!isPlainObject(parsed)) return json({ error: "Invalid JSON body" }, 400);

  /*
   * The minor's body is { consent_id } and has no decision. A body that
   * carries `decision`, or a token and no consent_id, is the guardian.
   * That post is not authenticated: the one-time token is the credential.
   */
  const hasConsentId = typeof parsed.consent_id === "string" && parsed.consent_id.length > 0;
  const guardianDecision = "decision" in parsed ||
    (typeof parsed.token === "string" && !hasConsentId);
  if (guardianDecision) {
    const token = typeof parsed.token === "string" ? parsed.token : null;
    const decision = parsed.decision === "approve" || parsed.decision === "decline"
      ? parsed.decision
      : null;
    if (!token || !decision) return json({ ok: false, state: "invalid" }, 400);
    const outcome = await recordDecision({
      token,
      decision,
      allow_discovery: optedIn(parsed.allow_discovery),
      allow_messaging: optedIn(parsed.allow_messaging),
      allow_media: optedIn(parsed.allow_media),
      allow_assessments: optedIn(parsed.allow_assessments),
      allow_sponsorship: optedIn(parsed.allow_sponsorship),
      allow_bookings: optedIn(parsed.allow_bookings),
    });
    return json({ ok: outcome.ok, state: outcome.state }, outcome.status);
  }

  const payload = parsed as { consent_id?: string; resend?: boolean };
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

  const { data: reservation, error: reservationError } = await admin.rpc(
    "reserve_guardian_consent_delivery",
    {
      p_consent: consent.id,
      p_minor: caller.user.id,
    },
  );
  if (reservationError) {
    console.error("guardian consent delivery reservation failed:", reservationError);
    return json({ error: "Could not reserve email delivery" }, 503);
  }
  if (!reservation?.ok) {
    return json({
      sent: false,
      code: reservation?.code ?? "rate_limited",
      retry_after: reservation?.retry_after ?? null,
    });
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
