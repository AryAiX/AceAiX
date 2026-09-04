import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Talent-score insights.
 *
 * Turns the deterministic pillar scores into two or three sentences an athlete
 * can act on. The number itself is never produced here — it is computed in SQL
 * and this function only explains it, so an outage or a missing API key can
 * never change anyone's score.
 *
 * With ANTHROPIC_API_KEY set, the wording comes from a model, constrained to
 * the facts we hand it. Without one, a written-in template does the same job.
 * Either way the athlete gets a real answer.
 *
 *   POST {}   (authenticated)  → writes talent_scores.ai_summary for the caller
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface Pillars {
  profile: number;
  performance: number;
  media: number;
  credibility: number;
  engagement: number;
}

const PILLAR_NAMES: Record<keyof Pillars, string> = {
  profile: "profile completeness",
  performance: "match record",
  media: "highlight clips",
  credibility: "verification and endorsements",
  engagement: "activity",
};

const PILLAR_ADVICE: Record<keyof Pillars, string> = {
  profile: "Filling in the last few profile fields is the quickest win available to you.",
  performance: "Logging your recent matches — minutes, goals, assists — is what turns a profile into evidence.",
  media: "Coaches watch before they read. Two or three short clips move this more than anything else.",
  credibility: "Ask a coach who knows your game to endorse you, and link your current club.",
  engagement: "Posting an update every week or two keeps you visible in search.",
};

/** The fallback, and the shape the model is asked to match. */
function templateSummary(
  overall: number,
  tier: string,
  pillars: Pillars,
  sport: string | null,
): string {
  const entries = Object.entries(pillars) as [keyof Pillars, number][];
  const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  const opener =
    overall >= 70
      ? `A ${overall} puts you in the ${tier} band — a strong profile that a scout will stop on.`
      : overall >= 40
        ? `A ${overall} is a solid start. ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier means the foundations are there.`
        : `A ${overall} means your profile is still young. That is normal — almost everyone starts here.`;

  const strength = `Your strongest area is ${PILLAR_NAMES[strongest[0]]}${
    sport ? ` for ${sport.toLowerCase()}` : ""
  }.`;

  return `${opener} ${strength} ${PILLAR_ADVICE[weakest[0]]}`;
}

async function modelSummary(
  overall: number,
  tier: string,
  pillars: Pillars,
  sport: string | null,
  isMinor: boolean,
): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;

  const prompt = `An athlete on AceAiX has a Talent Score of ${overall}/100 (${tier} tier).
Their five pillar scores, each out of 100, are:
- profile completeness: ${pillars.profile}
- match record: ${pillars.performance}
- highlight clips: ${pillars.media}
- verification and endorsements: ${pillars.credibility}
- activity on the platform: ${pillars.engagement}
Sport: ${sport ?? "not set"}.

Write two or three short sentences, addressed to them directly, that:
1. say plainly what the number reflects,
2. name their strongest pillar,
3. name the one change that would move the number most, and why.

Rules: warm and matter-of-fact, never hyped. ${
    isMinor ? "The reader may be as young as 13, so keep the language simple and never discouraging." : ""
  } Do not invent any statistic that is not listed above. Do not promise anyone will scout them. Do not use exclamation marks. Under 60 words. Reply with the sentences only.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "Not configured" }, 500);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not authenticated" }, 401);

  const { data: caller } = await admin.auth.getUser(jwt);
  if (!caller?.user) return json({ error: "Not authenticated" }, 401);

  const { data: athlete } = await admin
    .from("athlete_profiles")
    .select("id, sport")
    .eq("user_id", caller.user.id)
    .maybeSingle();

  if (!athlete) return json({ error: "No athlete profile for this account" }, 404);

  const { data: score } = await admin
    .from("talent_scores")
    .select(
      "overall, tier, profile_score, performance_score, media_score, credibility_score, engagement_score",
    )
    .eq("athlete_id", athlete.id)
    .maybeSingle();

  if (!score) return json({ error: "No score yet" }, 404);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_minor")
    .eq("id", caller.user.id)
    .maybeSingle();

  const pillars: Pillars = {
    profile: score.profile_score,
    performance: score.performance_score,
    media: score.media_score,
    credibility: score.credibility_score,
    engagement: score.engagement_score,
  };

  const summary =
    (await modelSummary(
      score.overall,
      score.tier,
      pillars,
      athlete.sport,
      profile?.is_minor ?? false,
    )) ?? templateSummary(score.overall, score.tier, pillars, athlete.sport);

  await admin
    .from("talent_scores")
    .update({ ai_summary: summary })
    .eq("athlete_id", athlete.id);

  return json({ ok: true, summary, generated_by: ANTHROPIC_KEY ? "model" : "template" });
});
