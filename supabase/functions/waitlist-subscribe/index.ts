import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://aceaix.com",
  "https://www.aceaix.com",
  "https://aceaix-marketing.vercel.app",
]);
const ROLES = new Set(["athlete", "parent", "coach", "club", "scout"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://www.aceaix.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(req, { error: "Waitlist service is not configured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const confirmationToken = url.searchParams.get("token");
    const destination = new URL(
      Deno.env.get("WAITLIST_SITE_URL") ?? "https://www.aceaix.com/",
    );
    if (!confirmationToken || confirmationToken.length !== 64) {
      destination.searchParams.set("subscribed", "0");
      return Response.redirect(destination, 302);
    }

    const confirmationTokenHash = await sha256(confirmationToken);
    const { data, error } = await admin
      .from("marketing_waitlist")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmation_token_hash: null,
        updated_at: new Date().toISOString(),
      })
      .eq("confirmation_token_hash", confirmationTokenHash)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    destination.searchParams.set("subscribed", !error && data ? "1" : "0");
    return Response.redirect(destination, 302);
  }

  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req, { error: "Origin not allowed" }, 403);

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 20_000) return json(req, { error: "Request is too large" }, 413);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON" }, 400);
  }

  // Honeypots should look successful so automated senders do not adapt.
  if (text(body.website, 200)) return json(req, { status: "pending" });

  const email = text(body.email, 254)?.toLowerCase() ?? "";
  const firstName = text(body.first_name, 100);
  const lastName = text(body.last_name, 100);
  const role = text(body.role, 20) ?? "athlete";
  const isAdult = body.is_adult === true;
  const guardianConfirmed = body.guardian_confirmed === true;
  const consentText = text(body.consent_text, 1_000);

  if (!EMAIL_RE.test(email)) return json(req, { error: "Enter a valid email address" }, 400);
  if (!firstName || !lastName) return json(req, { error: "First and last name are required" }, 400);
  if (!ROLES.has(role)) return json(req, { error: "Select a valid role" }, 400);
  if (body.consent !== true || !consentText) return json(req, { error: "Email consent is required" }, 400);
  if (!isAdult && !guardianConfirmed) {
    return json(req, { error: "A parent or guardian email is required for minors" }, 400);
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const salt = Deno.env.get("WAITLIST_RATE_LIMIT_SALT") ?? serviceKey;
  const ipHash = await sha256(`${salt}:${forwarded}`);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
  const { count } = await admin
    .from("marketing_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("updated_at", oneHourAgo);
  if ((count ?? 0) >= 10) return json(req, { error: "Too many attempts. Please try again later." }, 429);

  const { data: existing } = await admin
    .from("marketing_waitlist")
    .select("status")
    .eq("email", email)
    .maybeSingle();
  if (existing?.status === "confirmed") return json(req, { status: "already" });

  const confirmationToken = token();
  const confirmationTokenHash = await sha256(confirmationToken);
  const now = new Date().toISOString();
  const { error: saveError } = await admin.from("marketing_waitlist").upsert({
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    sport: text(body.sport, 100),
    city: text(body.city, 100),
    country: text(body.country, 100),
    is_adult: isAdult,
    guardian_confirmed: isAdult ? null : guardianConfirmed,
    consent: true,
    consent_text: consentText,
    source: text(body.source, 50) ?? "site-hero",
    status: "pending",
    confirmation_token_hash: confirmationTokenHash,
    ip_hash: ipHash,
    confirmed_at: null,
    unsubscribed_at: null,
    updated_at: now,
  }, { onConflict: "email" });
  if (saveError) {
    console.error("waitlist save failed", saveError);
    return json(req, { error: "We could not save your place just now" }, 500);
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("CONSENT_FROM_EMAIL") ?? "AceAiX <notifications@mail.aceaix.com>";
  if (!resendKey) return json(req, { error: "Confirmation email is not configured" }, 503);

  const confirmationUrl = `${supabaseUrl}/functions/v1/waitlist-subscribe?token=${confirmationToken}`;
  const recipient = isAdult ? firstName : "Parent or guardian";
  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Confirm your AceAiX early-access place",
      html: `<p>Hi ${recipient},</p>
        <p>Confirm this email address to join the AceAiX early-access list.</p>
        <p><a href="${confirmationUrl}">Confirm my place</a></p>
        <p>If you did not request this, you can ignore this email.</p>`,
    }),
  });
  if (!mail.ok) {
    console.error("waitlist confirmation failed", mail.status, await mail.text());
    // The database write is the source of truth. Do not tell the visitor their
    // signup failed just because the email provider is temporarily unavailable.
    return json(req, { status: "pending", confirmation_email: "deferred" }, 202);
  }

  return json(req, { status: "pending" });
});
