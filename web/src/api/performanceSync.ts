import { supabase, unwrap } from "./_helpers";

export interface SyncedPerformanceRecord {
  athlete_id: string;
  sport: string;
  season_or_period: string | null;
  stats: Record<string, unknown>;
  source: string;
  last_synced_at: string;
}

async function functionErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  const candidate = error as {
    message?: unknown;
    context?: { clone?: () => Response; json?: () => Promise<unknown> };
  } | null;
  if (candidate?.context?.json) {
    try {
      const response = (
        candidate.context.clone ? candidate.context.clone() : candidate.context
      ) as {
        json: () => Promise<unknown>;
      };
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim())
        return payload.error;
    } catch {
      // Use the SDK message or a stable fallback for non-JSON errors.
    }
  }
  const message =
    typeof candidate?.message === "string" ? candidate.message.trim() : "";
  return message && !/non-2xx status code/i.test(message) ? message : fallback;
}

export async function latestSyncedPerformance(
  userId: string,
  sport: string,
): Promise<SyncedPerformanceRecord | null> {
  return unwrap<SyncedPerformanceRecord | null>(
    await supabase
      .from("performance_records")
      .select("athlete_id,sport,season_or_period,stats,source,last_synced_at")
      .eq("athlete_id", userId)
      .ilike("sport", sport)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

export async function syncChess(input: {
  userId: string;
  chesscomUsername?: string | null;
  lichessUsername?: string | null;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("sync-chess", {
    body: {
      athlete_id: input.userId,
      chesscom_username: input.chesscomUsername,
      lichess_username: input.lichessUsername,
    },
  });
  if (error)
    throw new Error(
      await functionErrorMessage(error, "Chess sync failed. Try again later."),
    );
  if (data?.ok === false || data?.error)
    throw new Error(data.error ?? "Chess sync failed. Try again later.");
}

export async function syncFootball(input: {
  userId: string;
  playerId: string;
  league?: string | null;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("sync-football", {
    body: {
      athlete_id: input.userId,
      player_id: input.playerId,
      league: input.league,
    },
  });
  if (error) {
    throw new Error(
      await functionErrorMessage(
        error,
        "Football sync failed. You can add match data manually in the meantime.",
      ),
    );
  }
  if (data?.ok === false || data?.error)
    throw new Error(data.error ?? "Football sync failed.");
}
