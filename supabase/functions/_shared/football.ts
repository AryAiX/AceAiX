type JsonRecord = Record<string, unknown>;

export interface FootballSyncStats extends JsonRecord {
  team: string | null;
  league: string | null;
  appearances: number;
  apps: number;
  goals: number;
  assists: number;
  minutes: number;
  rating: number | null;
  average_rating: number | null;
  avg_rating: number | null;
  shots_total: number;
  shots_on: number;
  shots_per_game: number;
  passes_accuracy: number | null;
  pass_accuracy: number | null;
  pass_acc: number | null;
  dribbles_success: number;
  tackles: number;
  yellow_cards: number;
  red_cards: number;
  attributes: JsonRecord;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function numberValue(value: unknown): number {
  if (typeof value === "string") value = value.replace("%", "");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseApiFootballResponse(
  value: unknown,
  requestedLeague?: string,
): FootballSyncStats {
  const root = record(value);
  const entries = Array.isArray(root.response) ? root.response : [];
  if (!entries.length) throw new Error("player_not_found");

  const entry = record(entries[0]);
  const player = record(entry.player);
  const allStatistics = Array.isArray(entry.statistics)
    ? entry.statistics.map(record)
    : [];
  const requested = requestedLeague?.trim().toLowerCase();
  const selected = requested
    ? allStatistics.filter(
        (block) =>
          String(record(block.league).name ?? "").toLowerCase() === requested,
      )
    : allStatistics;
  const statistics = selected.length ? selected : allStatistics;
  if (!statistics.length) throw new Error("statistics_not_found");

  let appearances = 0;
  let goals = 0;
  let assists = 0;
  let minutes = 0;
  let shotsTotal = 0;
  let shotsOn = 0;
  let dribbles = 0;
  let tackles = 0;
  let yellows = 0;
  let reds = 0;
  let weightedRating = 0;
  let ratingWeight = 0;
  let weightedPassAccuracy = 0;
  let passWeight = 0;
  let primary = statistics[0];
  let primaryApps = -1;

  for (const block of statistics) {
    const games = record(block.games);
    const blockApps = numberValue(games.appearences ?? games.appearances);
    const blockMinutes = numberValue(games.minutes);
    const blockRating = numberValue(games.rating);
    const goalsBlock = record(block.goals);
    const shots = record(block.shots);
    const passes = record(block.passes);
    const dribblesBlock = record(block.dribbles);
    const tacklesBlock = record(block.tackles);
    const cards = record(block.cards);
    const passAccuracy = numberValue(passes.accuracy);

    appearances += blockApps;
    minutes += blockMinutes;
    goals += numberValue(goalsBlock.total);
    assists += numberValue(goalsBlock.assists);
    shotsTotal += numberValue(shots.total);
    shotsOn += numberValue(shots.on);
    dribbles += numberValue(dribblesBlock.success);
    tackles += numberValue(tacklesBlock.total);
    yellows += numberValue(cards.yellow);
    reds += numberValue(cards.red);
    if (blockRating > 0) {
      const weight = Math.max(blockApps, 1);
      weightedRating += blockRating * weight;
      ratingWeight += weight;
    }
    if (passAccuracy > 0) {
      const weight = Math.max(blockMinutes, blockApps, 1);
      weightedPassAccuracy += passAccuracy * weight;
      passWeight += weight;
    }
    if (blockApps > primaryApps) {
      primaryApps = blockApps;
      primary = block;
    }
  }

  const primaryTeam = record(primary.team);
  const primaryLeague = record(primary.league);
  const rating = ratingWeight
    ? Number((weightedRating / ratingWeight).toFixed(2))
    : null;
  const passAccuracy = passWeight
    ? Number((weightedPassAccuracy / passWeight).toFixed(1))
    : null;

  return {
    team: typeof primaryTeam.name === "string" ? primaryTeam.name : null,
    league: typeof primaryLeague.name === "string" ? primaryLeague.name : null,
    appearances,
    apps: appearances,
    goals,
    assists,
    minutes,
    rating,
    average_rating: rating,
    avg_rating: rating,
    shots_total: shotsTotal,
    shots_on: shotsOn,
    shots_per_game: appearances
      ? Number((shotsTotal / appearances).toFixed(2))
      : 0,
    passes_accuracy: passAccuracy,
    pass_accuracy: passAccuracy,
    pass_acc: passAccuracy,
    dribbles_success: dribbles,
    tackles,
    yellow_cards: yellows,
    red_cards: reds,
    attributes: {
      api_player_id: player.id ?? null,
      name: player.name ?? null,
      firstname: player.firstname ?? null,
      lastname: player.lastname ?? null,
      nationality: player.nationality ?? null,
      age: player.age ?? null,
      height: player.height ?? null,
      weight: player.weight ?? null,
      photo: player.photo ?? null,
      competitions: statistics.map((block) => ({
        league: record(block.league).name ?? null,
        team: record(block.team).name ?? null,
      })),
    },
  };
}
