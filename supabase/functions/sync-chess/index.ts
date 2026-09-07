import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticatedClient, serviceClient } from "../_shared/auth.ts";
import { handlePreflight, json } from "../_shared/http.ts";
import {
  mergeChessStats,
  parseChessCom,
  parseLichess,
  type ChessSyncStats,
} from "../_shared/chess.ts";

type SyncPayload = {
  athlete_id?: string;
  chesscom_username?: string | null;
  lichess_username?: string | null;
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;
const REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    Deno.env.get("CHESS_API_USER_AGENT") ?? "AceAiX/1.0 (support@aceaix.com)",
};

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status === 404) throw new Error("username_not_found");
  if (response.status === 429) throw new Error("provider_rate_limited");
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return response.json();
}

async function chessComStats(username: string): Promise<ChessSyncStats> {
  const encoded = encodeURIComponent(username.toLowerCase());
  const [profile, stats] = await Promise.all([
    fetchJson(`https://api.chess.com/pub/player/${encoded}`),
    fetchJson(`https://api.chess.com/pub/player/${encoded}/stats`),
  ]);

  let games: unknown = { games: [] };
  try {
    const archives = (await fetchJson(
      `https://api.chess.com/pub/player/${encoded}/games/archives`,
    )) as { archives?: unknown };
    const urls = Array.isArray(archives.archives)
      ? archives.archives.filter(
          (url): url is string => typeof url === "string",
        )
      : [];
    const latestUrl = urls.at(-1);
    if (latestUrl?.startsWith("https://api.chess.com/pub/"))
      games = await fetchJson(latestUrl);
  } catch (error) {
    console.warn("Chess.com game history unavailable", String(error));
  }

  return parseChessCom(username, profile, stats, games);
}

async function lichessStats(username: string): Promise<ChessSyncStats> {
  const encoded = encodeURIComponent(username);
  const [user, history] = await Promise.all([
    fetchJson(`https://lichess.org/api/user/${encoded}`),
    fetchJson(`https://lichess.org/api/user/${encoded}/rating-history`),
  ]);

  let games: unknown[] = [];
  try {
    const response = await fetch(
      `https://lichess.org/api/games/user/${encoded}?max=20&moves=false&clocks=false&evals=false&opening=true`,
      {
        headers: { ...REQUEST_HEADERS, Accept: "application/x-ndjson" },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (response.ok) {
      const text = await response.text();
      games = text
        .split("\n")
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return [];
          }
        });
    }
  } catch (error) {
    console.warn("Lichess game history unavailable", String(error));
  }

  return parseLichess(username, user, history, games);
}

function cleanUsername(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const username = value.trim();
  if (!USERNAME_PATTERN.test(username)) throw new Error("invalid_username");
  return username;
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
    .select("chesscom_username,lichess_username")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Chess profile lookup failed", profileError.message);
    return json(
      {
        ok: false,
        code: "profile_error",
        error: "Athlete profile could not be loaded",
      },
      500,
    );
  }

  let chesscom: string | null;
  let lichess: string | null;
  try {
    chesscom = cleanUsername(profile?.chesscom_username);
    lichess = cleanUsername(profile?.lichess_username);
  } catch {
    return json(
      {
        ok: false,
        code: "invalid_username",
        error:
          "Chess usernames may only contain letters, numbers, underscores, and hyphens",
      },
      400,
    );
  }
  if (!chesscom && !lichess) {
    return json(
      {
        ok: false,
        code: "missing_username",
        error: "Add a Chess.com or Lichess username in Settings before syncing",
      },
      400,
    );
  }

  const { data: freshRecord } = await auth.client
    .from("performance_records")
    .select("stats,source,last_synced_at")
    .eq("athlete_id", auth.user.id)
    .ilike("sport", "chess")
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
      synced_at: freshRecord.last_synced_at,
      warnings: [],
    });
  }

  const sources: ChessSyncStats[] = [];
  const sourceNames: string[] = [];
  const failures: Array<{ provider: string; reason: string }> = [];

  if (chesscom) {
    try {
      sources.push(await chessComStats(chesscom));
      sourceNames.push("chesscom");
    } catch (error) {
      failures.push({
        provider: "Chess.com",
        reason: String(error instanceof Error ? error.message : error),
      });
    }
  }
  if (lichess) {
    try {
      sources.push(await lichessStats(lichess));
      sourceNames.push("lichess");
    } catch (error) {
      failures.push({
        provider: "Lichess",
        reason: String(error instanceof Error ? error.message : error),
      });
    }
  }

  if (!sources.length) {
    const usernameMissing = failures.every(
      (failure) => failure.reason === "username_not_found",
    );
    return json(
      {
        ok: false,
        code: usernameMissing ? "username_not_found" : "provider_unavailable",
        error: usernameMissing
          ? "No public chess profile was found for the saved username"
          : "Chess providers are temporarily unavailable. Try again later.",
        failures,
      },
      usernameMissing ? 404 : 502,
    );
  }

  const stats = mergeChessStats(sources);
  const source = sourceNames.join(",");
  const syncedAt = new Date().toISOString();
  const period = String(new Date().getUTCFullYear());

  const { error: commitError } = await admin.rpc(
    "commit_external_performance_sync",
    {
      p_athlete_id: auth.user.id,
      p_sport: "chess",
      p_period: period,
      p_stats: stats,
      p_source: source,
      p_synced_at: syncedAt,
    },
  );
  if (commitError) {
    console.error("Chess sync commit failed", commitError.message);
    return json(
      {
        ok: false,
        code: "persistence_failed",
        error: "Chess data could not be saved. Try again later.",
      },
      500,
    );
  }

  return json({
    ok: true,
    status: "synced",
    stats,
    source,
    synced_at: syncedAt,
    warnings: failures,
  });
});
