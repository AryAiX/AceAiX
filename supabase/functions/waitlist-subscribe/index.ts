import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * The launch waitlist, from the marketing site.
 *
 *   POST   { email, first_name?, is_adult, guardian_confirmed?, consent,
 *            consent_text, role?, sport?, country?, locale?, source?, website? }
 *     → { ok: true, status: "pending" | "already" }
 *
 *   `is_adult: false` requires `guardian_confirmed: true`, and `email` must
 *   then be the guardian's — see the comment at that check.
 *   GET    ?confirm=<uuid>        → 302 to the site, ?subscribed=1
 *   GET    ?unsubscribe=<uuid>    → 302 to the site, ?unsubscribed=1
 *
 * ------------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS AT ALL
 *
 * The obvious implementation is an `insert` from the page with the anon key.
 * That would mean granting `anon` write access to a table of email addresses,
 * with the key to do it printed in the page source. Three things then become
 * impossible: a rate limit an attacker cannot skip, a secret for the campaign
 * tool, and a confirmation email. And one thing becomes far too easy — if the
 * select policy is ever loosened by a later migration, the whole list is
 * downloadable by anybody who views source.
 *
 * So `public.waitlist` grants nothing to `anon`, and this function is the only
 * door. It holds the service-role key, which bypasses RLS; every check below
 * is therefore a real check rather than a suggestion to a client that an
 * attacker controls.
 * ------------------------------------------------------------------
 *
 * NO CAMPAIGN PROVIDER CONFIGURED IS A NORMAL ANSWER, NOT AN ERROR.
 * With no key set the address still lands in the table and the sign-up still
 * succeeds; only the push to Brevo/Mailchimp is skipped, and `synced_at` stays
 * null so it can be back-filled later. Turning it on is one environment
 * variable — no site deploy, no migration. Same shape as `translate`.
 *
 * See docs/25-the-waitlist.md.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Set exactly one of these to start syncing to a campaign tool. */
const BREVO_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_LIST_ID = Deno.env.get("BREVO_LIST_ID");
const MAILCHIMP_KEY = Deno.env.get("MAILCHIMP_API_KEY");
const MAILCHIMP_LIST_ID = Deno.env.get("MAILCHIMP_LIST_ID");

/** Where the confirm and unsubscribe links send people back to. */
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://aceaix.com";

/**
 * Peppers the IP before it is stored. Without it the column is a list of IP
 * addresses next to names, which is personal data we have no reason to hold;
 * with it, it is only good for counting repeats.
 *
 * If unset, no IP is stored at all and the rate limit falls back to the
 * address itself. That is the safe direction to fail in.
 */
const IP_PEPPER = Deno.env.get("WAITLIST_IP_PEPPER");

/** Sign-ups permitted from one IP in the window. Generous for a household or
    an office behind one address, useless for a script. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MINUTES = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Client-Info, Apikey",
};

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function redirect(query: string) {
  return new Response(null, {
    status: 302,
    headers: { ...CORS, Location: `${SITE_URL}/?${query}#get` },
  });
}

/**
 * Deliberately not a full RFC 5322 implementation.
 *
 * The real test of an address is whether the confirmation email arrives, which
 * is what double opt-in is for. This only rejects what is obviously not an
 * address, so that a typo fails here rather than becoming a bounce later.
 */
function validEmail(value: string): boolean {
  if (value.length > 254 || value.length < 6) return false;
  if (/\s/.test(value)) return false;
  const at = value.split("@");
  if (at.length !== 2) return false;
  const [local, domain] = at;
  if (!local || local.length > 64) return false;
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  return /^[^@\s]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function callerIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip");
}

// ── The one place a campaign provider is named ───────────────────────────────

interface SyncResult {
  provider: string;
  ok: boolean;
  error?: string;
}

/**
 * Push one confirmed address to the campaign tool.
 *
 * Called only after confirmation, never on sign-up: an unconfirmed address has
 * not been proven to belong to the person who typed it, and pushing it would
 * put an unverified address into a list Macy can mail.
 *
 * Adding a provider means one branch here and nothing else.
 */
async function syncToProvider(
  email: string,
  firstName: string | null,
): Promise<SyncResult> {
  if (BREVO_KEY && BREVO_LIST_ID) {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        attributes: firstName ? { FIRSTNAME: firstName } : {},
        listIds: [Number(BREVO_LIST_ID)],
        updateEnabled: true,
      }),
    });
    /* Brevo answers 204 for a new contact and 400 `duplicate_parameter` when
       it already knows the address. The second is a success for us. */
    if (res.ok) return { provider: "brevo", ok: true };
    const body = await res.text();
    if (res.status === 400 && body.includes("duplicate_parameter")) {
      return { provider: "brevo", ok: true };
    }
    return { provider: "brevo", ok: false, error: `${res.status} ${body.slice(0, 200)}` };
  }

  if (MAILCHIMP_KEY && MAILCHIMP_LIST_ID) {
    /* The datacentre is the suffix of the key — `abc123...-us14`. */
    const dc = MAILCHIMP_KEY.split("-")[1];
    if (!dc) return { provider: "mailchimp", ok: false, error: "key has no datacentre suffix" };
    const hash = await sha256(email.toLowerCase());
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members/${hash}`,
      {
        method: "PUT", // upsert, so a repeat is not an error
        headers: {
          Authorization: `Basic ${btoa(`anystring:${MAILCHIMP_KEY}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status_if_new: "subscribed",
          merge_fields: firstName ? { FNAME: firstName } : {},
        }),
      },
    );
    if (res.ok) return { provider: "mailchimp", ok: true };
    return {
      provider: "mailchimp",
      ok: false,
      error: `${res.status} ${(await res.text()).slice(0, 200)}`,
    };
  }

  /* Nothing configured. The row is already saved; this is not a failure. */
  return { provider: "none", ok: true };
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "The waitlist is not configured" }, 503);
  }

  const url = new URL(req.url);

  // ── Confirm ───────────────────────────────────────────────────────────────
  if (req.method === "GET" && url.searchParams.has("confirm")) {
    const token = url.searchParams.get("confirm") ?? "";
    const { data, error } = await admin.rpc("confirm_waitlist", { p_token: token });
    if (error || !data) return redirect("subscribed=0");

    /* Now, and only now, does the address reach the campaign tool. */
    const { data: row } = await admin
      .from("waitlist")
      .select("email, first_name, synced_at")
      .eq("confirm_token", token)
      .maybeSingle();

    if (row && !row.synced_at) {
      const sync = await syncToProvider(row.email, row.first_name);
      await admin
        .from("waitlist")
        .update({
          synced_at: sync.ok && sync.provider !== "none" ? new Date().toISOString() : null,
          sync_provider: sync.provider,
          sync_error: sync.ok ? null : sync.error,
        })
        .eq("confirm_token", token);
    }

    return redirect("subscribed=1");
  }

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  if (req.method === "GET" && url.searchParams.has("unsubscribe")) {
    const token = url.searchParams.get("unsubscribe") ?? "";
    const { data } = await admin.rpc("unsubscribe_waitlist", { p_token: token });
    return redirect(data ? "unsubscribed=1" : "unsubscribed=0");
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // ── Sign up ───────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }

  /* The honeypot. A field hidden with CSS that a person never sees and never
     fills in; most form bots fill every input they find. Answering 200 rather
     than an error means the bot has no signal to adapt to. */
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, status: "pending" });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!validEmail(email)) {
    return json({ error: "That does not look like an email address", field: "email" }, 400);
  }

  /* Both boxes are unticked by default on the page, and both are checked here
     rather than there, because a client-side check protects nobody. */
  if (body.consent !== true) {
    return json({ error: "Please agree to receive the launch email", field: "consent" }, 400);
  }
  /* Under 18 is allowed, on one condition: the address must belong to a
     parent or guardian, never to the child.

     AceAiX is for 13–25 year-olds, so a sign-up page that refused everybody
     under eighteen would turn away most of the demand it exists to measure.
     But we will not hold a child's email address, so a minor signs up by
     giving a guardian's — and that is the address every later email goes to.
     The child's own contact details are never asked for and never stored.

     The database says the same thing in `waitlist_guardian_required`, so a
     future edit to this file cannot quietly start mailing children. */
  const isAdult = body.is_adult === true;
  if (!isAdult && body.guardian_confirmed !== true) {
    return json(
      {
        error: "Under 18? Use a parent or guardian's email address, and ask them first.",
        field: "guardian_confirmed",
        hint: "guardian_required",
      },
      400,
    );
  }

  const consentText = String(body.consent_text ?? "").trim();
  if (consentText.length < 10 || consentText.length > 500) {
    return json({ error: "Missing consent wording" }, 400);
  }

  const firstName = typeof body.first_name === "string"
    ? body.first_name.trim().slice(0, 80) || null
    : null;

  /* Self-declared and used for nothing but deciding which launch email
     somebody gets. An unknown value is dropped rather than refused — a form
     that rejects a sign-up over a segmentation field has its priorities
     backwards. */
  const ROLES = ["athlete", "parent", "coach", "club", "scout"];
  const role = typeof body.role === "string" && ROLES.includes(body.role.trim().toLowerCase())
    ? body.role.trim().toLowerCase()
    : null;
  const sport = typeof body.sport === "string" ? body.sport.trim().slice(0, 40) || null : null;
  const country = typeof body.country === "string"
    ? body.country.trim().slice(0, 60) || null
    : null;
  const locale = typeof body.locale === "string" ? body.locale.trim().slice(0, 12) : null;
  const source = typeof body.source === "string" ? body.source.trim().slice(0, 40) : "site";

  // Rate limit, by peppered IP.
  const ip = callerIp(req);
  const ipHash = ip && IP_PEPPER ? await sha256(`${IP_PEPPER}:${ip}`) : null;

  if (ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await admin
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if ((count ?? 0) >= RATE_LIMIT) {
      return json({ error: "Too many sign-ups from here. Try again later." }, 429);
    }
  }

  /* Already on the list? Say so plainly and do not touch the row — resending
     a confirmation on demand would make this endpoint a way to send mail to
     an arbitrary address repeatedly. */
  const { data: existing } = await admin
    .from("waitlist")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return json({ ok: true, status: "already", state: existing.status });
  }

  const { data: inserted, error } = await admin
    .from("waitlist")
    .insert({
      email,
      first_name: firstName,
      locale,
      source,
      consent_text: consentText,
      is_adult: isAdult,
      /* Equal to `email` by construction, never a second address. The check
         constraint refuses the row otherwise. */
      guardian_email: isAdult ? null : email,
      role,
      sport,
      country,
      ip_hash: ipHash,
    })
    .select("confirm_token")
    .single();

  if (error) {
    /* A race against the unique index: somebody submitted the same address
       twice in the same second. Not an error to show anybody. */
    if (error.code === "23505") return json({ ok: true, status: "already" });
    console.error("waitlist insert failed", error);
    return json({ error: "Could not save that just now" }, 500);
  }

  /* The confirmation email is sent by the campaign tool's own transactional
     API, which is not configured yet. Until it is, the row sits at `pending`
     and nothing is emailed — which is the correct behaviour for an address
     nobody has proven. `confirm_sent_at` stays null, so the back-fill knows
     exactly which rows never got their email. */
  const confirmUrl =
    `${SUPABASE_URL}/functions/v1/waitlist-subscribe?confirm=${inserted.confirm_token}`;
  console.log(`waitlist: pending confirmation for ${email} → ${confirmUrl}`);

  return json({ ok: true, status: "pending" });
});
