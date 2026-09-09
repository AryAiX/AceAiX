import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Translate a post, a comment or a message.
 *
 * The cache in `public.translations` answers most calls without ever reaching
 * here — the client asks `cached_translation()` first and only calls this on a
 * miss. So this function is the expensive path, and it is written to be as
 * rare as possible: translate once, store, and let everyone else read the row.
 *
 *   POST { text, target }   (authenticated)
 *     → { translated, detected_lang, provider, cached }
 *
 * ------------------------------------------------------------------
 * NO PROVIDER CONFIGURED IS A NORMAL ANSWER, NOT AN ERROR
 *
 * Which engine translates is a commercial decision with a key attached. Until
 * one is set, this answers `{ provider: "none" }` with the source text
 * unchanged, and the client leaves the original showing. Nothing breaks, no
 * screen shows an error, and turning the feature on later is one environment
 * variable — no client release, no migration.
 *
 * Adding a provider means one branch in `callProvider` and nothing else.
 * ------------------------------------------------------------------
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/** Set exactly one of these to turn the feature on. */
const GOOGLE_KEY = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
const DEEPL_KEY = Deno.env.get("DEEPL_API_KEY");

/** The seven the app itself speaks. A target outside this set is refused. */
const SUPPORTED = ["en", "ar", "es", "fr", "de", "ru", "zh"];

/** Long enough for any post; a wall of text is not what this is for. */
const MAX_CHARS = 4000;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface Translated {
  translated: string;
  detected_lang: string | null;
  provider: string;
}

/**
 * The one place a provider is called.
 *
 * Everything above and below this function — the cache, the RPC, the button,
 * the rate limit — is provider-agnostic, so swapping Google for DeepL is a
 * change to this function and nothing else.
 */
async function callProvider(text: string, target: string): Promise<Translated> {
  if (GOOGLE_KEY) {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, target, format: "text" }),
      },
    );
    if (!res.ok) throw new Error(`google ${res.status}`);
    const body = await res.json();
    const t = body?.data?.translations?.[0];
    return {
      translated: t?.translatedText ?? text,
      detected_lang: t?.detectedSourceLanguage ?? null,
      provider: "google",
    };
  }

  if (DEEPL_KEY) {
    const res = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [text], target_lang: target.toUpperCase() }),
    });
    if (!res.ok) throw new Error(`deepl ${res.status}`);
    const body = await res.json();
    const t = body?.translations?.[0];
    return {
      translated: t?.text ?? text,
      detected_lang: t?.detected_source_language?.toLowerCase() ?? null,
      provider: "deepl",
    };
  }

  /* Nothing configured. The source text comes back and the client shows the
     original — the button simply does not appear. */
  return { translated: text, detected_lang: null, provider: "none" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: "Translation is not configured" }, 503);
  }

  /* Who is asking. Translation costs money per character, so it is for signed-in
     accounts only — an open endpoint here is somebody else's translation bill. */
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: who, error: whoErr } = await caller.auth.getUser();
  if (whoErr || !who.user) return json({ error: "Invalid or expired session" }, 401);

  let text: string;
  let target: string;
  try {
    const body = await req.json();
    text = String(body?.text ?? "").trim();
    target = String(body?.target ?? "").trim().toLowerCase();
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }

  if (!text) return json({ error: "Nothing to translate" }, 400);
  if (text.length > MAX_CHARS) {
    return json({ error: `Text is longer than ${MAX_CHARS} characters` }, 413);
  }
  if (!SUPPORTED.includes(target)) {
    return json({ error: `Unsupported target language: ${target}` }, 400);
  }

  /* Check the cache again. The client checked before calling, but two people
     opening the same post at the same moment both miss and both arrive here;
     this turns the second one back before it costs anything. */
  const { data: hit } = await admin.rpc("cached_translation", {
    p_source: text,
    p_target: target,
  });
  if (hit) return json({ ...hit, cached: true });

  let result: Translated;
  try {
    result = await callProvider(text, target);
  } catch (err) {
    /* A provider outage must not look like a broken app. The original text
       stays on screen and the person can try again later. */
    console.error("translate provider failed:", err);
    return json({ error: "Translation is unavailable right now" }, 502);
  }

  if (result.provider === "none") {
    return json({ ...result, cached: false, configured: false });
  }

  /* Store it before answering, so the next reader is free even if this
     response never arrives. A failed write is not worth failing the request
     over — it only costs one more translation later. */
  const { error: writeErr } = await admin.rpc("store_translation", {
    p_source: text,
    p_target: target,
    p_translated: result.translated,
    p_provider: result.provider,
    p_detected_lang: result.detected_lang,
  });
  if (writeErr) console.error("translation cache write failed:", writeErr);

  return json({ ...result, cached: false, configured: true });
});
