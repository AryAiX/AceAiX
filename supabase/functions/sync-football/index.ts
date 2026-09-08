import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticatedClient, serviceClient } from "../_shared/auth.ts";
import { parseApiFootballResponse } from "../_shared/football.ts";
import { handlePreflight, json } from "../_shared/http.ts";

type SyncPayload = {
  athlete_id?: string;
  player_id?: string;
  season?: string | number;
  league?: string;
};

function defaultSeason(): number {
  const now = new Date();
  return now.getUTCMonth() < 6
    ? now.getUTCFullYear() - 1
    : now.getUTCFullYear();
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST")
    return json(
      { ok: false, code: "method_not_allowed", error: "Method not allowed" },
      405,
    );

  const auth = await authenticatedClient(req);
  if ("error" in auth)
    return json(
      { ok: false, code: "unauthorized", error: auth.error },
      auth.status,
    );
  const admin = serviceClient();
  if (!admin) {
    return json(
      {
        ok: false,
        code: "service_unconfigured",
        error: "Performance sync service is not configured",
      },
      503,
    );
  }

  let payload: SyncPayload;
  try {
    payload = await req.json();
  } catch {
    return json(
      { ok: false, code: "invalid_request", error: "Invalid JSON body" },
      400,
    );
  }
  if (payload.athlete_id && payload.athlete_id !== auth.user.id) {
    return json(
      {
        ok: false,
        code: "forbidden",
        error: "You can only sync your own performance data",
      },
      403,
    );
  }

  const { data: userProfile } = await auth.client
    .from("user_profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (userProfile?.role !== "athlete") {
    return json(
      {
        ok: false,
        code: "not_athlete",
        error: "Only athlete accounts can sync performance data",
      },
      403,
    );
  }

  const { data: profile, error: profileError } = await auth.client
    .from("athlete_profiles")
    .select("football_api_player_id,league")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Football profile lookup failed", profileError.message);
    return json(
      {
        ok: false,
        code: "profile_error",
        error: "Athlete profile could not be loaded",
      },
      500,
    );
  }

  const assignedPlayerId = String(profile?.football_api_player_id ?? "").trim();
  const requestedPlayerId = String(
    payload.player_id ?? assignedPlayerId,
  ).trim();
  if (!assignedPlayerId) {
    return json(
      {
        ok: false,
        code: "player_not_linked",
        error:
          "A verified football player ID must be assigned by an administrator before syncing",
      },
      400,
    );
  }
  if (requestedPlayerId !== assignedPlayerId) {
    return json(
      {
        ok: false,
        code: "player_id_mismatch",
        error:
          "The requested player ID does not match your verified football identity",
      },
      403,
    );
  }
  if (!/^\d+$/.test(assignedPlayerId)) {
    return json(
      {
        ok: false,
        code: "invalid_player_id",
        error: "The linked football player ID is invalid",
      },
      400,
    );
  }

  const season = Number(payload.season ?? defaultSeason());
  if (
    !Number.isInteger(season) ||
    season < 2000 ||
    season > new Date().getUTCFullYear() + 1
  ) {
    return json(
      {
        ok: false,
        code: "invalid_season",
        error: "Season must be a valid four-digit year",
      },
      400,
    );
  }

  const apiKey =
    Deno.env.get("API_FOOTBALL_KEY") ?? Deno.env.get("API_SPORTS_KEY");
  if (!apiKey) {
    return json({
      ok: false,
      code: "provider_unconfigured",
      error:
        "Live football sync is not configured yet. You can add stats manually in the meantime.",
      fallback: true,
      reason: "You can continue using manually entered statistics.",
      retryable: false,
    });
  }

  const { data: freshRecord } = await auth.client
    .from("performance_records")
    .select("stats,source,last_synced_at,season_or_period")
    .eq("athlete_id", auth.user.id)
    .ilike("sport", "football")
    .eq("season_or_period", String(season))
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    freshRecord?.last_synced_at &&
    Date.now() - new Date(freshRecord.last_synced_at).getTime() < 5 * 60_000
  ) {
    return json({
      ok: true,
      status: "fresh",
      stats: freshRecord.stats,
      source: freshRecord.source,
      season: freshRecord.season_or_period,
      synced_at: freshRecord.last_synced_at,
    });
  }

  const url = new URL("https://v3.football.api-sports.io/players");
  url.searchParams.set("id", assignedPlayerId);
  url.searchParams.set("season", String(season));

  let providerPayload: unknown;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "x-apisports-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 429) {
      return json(
        {
          ok: false,
          code: "provider_rate_limited",
          error:
            "Football sync has reached its provider limit. Try again later.",
        },
        429,
      );
    }
    if (!response.ok) {
      console.error("API-Football HTTP error", response.status);
      return json(
        {
          ok: false,
          code: "provider_unavailable",
          error: "Football data is temporarily unavailable. Try again later.",
        },
        502,
      );
    }
    providerPayload = await response.json();
  } catch (error) {
    console.error("API-Football request failed", String(error));
    return json(
      {
        ok: false,
        code: "provider_unavailable",
        error: "Football data is temporarily unavailable. Try again later.",
      },
      502,
    );
  }

  const root =
    providerPayload && typeof providerPayload === "object"
      ? (providerPayload as Record<string, unknown>)
      : {};
  const providerErrors = root.errors;
  if (
    (Array.isArray(providerErrors) && providerErrors.length) ||
    (providerErrors &&
      typeof providerErrors === "object" &&
      Object.keys(providerErrors).length)
  ) {
    console.error(
      "API-Football response errors",
      JSON.stringify(providerErrors),
    );
    const serialized = JSON.stringify(providerErrors).toLowerCase();
    const subscriptionIssue = /subscription|plan|access|key|token/.test(
      serialized,
    );
    const quotaIssue = /limit|quota|request/.test(serialized);
    return json(
      {
        ok: false,
        code: subscriptionIssue
          ? "provider_subscription_required"
          : quotaIssue
            ? "provider_rate_limited"
            : "provider_rejected",
        error: subscriptionIssue
          ? "The API-Football subscription does not include this player or season."
          : quotaIssue
            ? "Football sync has reached its provider limit. Try again later."
            : "Football provider rejected the request. Check the linked player.",
        retryable: !subscriptionIssue,
        fallback: subscriptionIssue,
        reason: subscriptionIssue
          ? "You can continue using manually entered statistics."
          : undefined,
      },
      subscriptionIssue ? 200 : quotaIssue ? 429 : 502,
    );
  }

  let stats;
  try {
    stats = parseApiFootballResponse(providerPayload);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "statistics_not_found";
    return json(
      {
        ok: false,
        code: reason,
        error:
          reason === "player_not_found"
            ? "No API-Football player was found for the linked ID and season"
            : "No football statistics are available for the linked player and season",
      },
      404,
    );
  }

  const syncedAt = new Date().toISOString();
  const source = "api_football";
  const { error: commitError } = await admin.rpc(
    "commit_external_performance_sync",
    {
      p_athlete_id: auth.user.id,
      p_sport: "football",
      p_period: String(season),
      p_stats: stats,
      p_source: source,
      p_synced_at: syncedAt,
    },
  );
  if (commitError) {
    console.error("Football sync commit failed", commitError.message);
    return json(
      {
        ok: false,
        code: "persistence_failed",
        error: "Football data could not be saved. Try again later.",
      },
      500,
    );
  }

  return json({
    ok: true,
    status: "synced",
    stats,
    source,
    season: String(season),
    synced_at: syncedAt,
  });
});
