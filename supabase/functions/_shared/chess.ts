export type JsonRecord = Record<string, unknown>;

export interface RecentChessGame {
  opponent: string;
  opponentRating: number | null;
  result: "win" | "loss" | "draw";
  time_class: string;
  opening: string | null;
  date: string | null;
  accuracy: number | null;
  url: string | null;
}

export interface ChessSyncStats extends JsonRecord {
  rapid_current: number | null;
  rapid_peak: number | null;
  rapid_wins: number;
  rapid_losses: number;
  rapid_draws: number;
  blitz_current: number | null;
  blitz_peak: number | null;
  blitz_wins: number;
  blitz_losses: number;
  blitz_draws: number;
  bullet_current: number | null;
  bullet_peak: number | null;
  bullet_wins: number;
  bullet_losses: number;
  bullet_draws: number;
  classical_current: number | null;
  classical_peak: number | null;
  classical_wins: number;
  classical_losses: number;
  classical_draws: number;
  fide_rating: number | null;
  title: string | null;
  rating_history: Record<string, Array<{ ts: string; r: number }>>;
  recent_games: RecentChessGame[];
  wins: number;
  losses: number;
  draws: number;
  peak_rating: number | null;
  rapid_rating: number | null;
  blitz_rating: number | null;
  bullet_rating: number | null;
  classical_rating: number | null;
}

const VARIANTS = ["rapid", "blitz", "bullet", "classical"] as const;
type Variant = (typeof VARIANTS)[number];

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(parsed)
    ? parsed
    : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function blankStats(): ChessSyncStats {
  return {
    rapid_current: null,
    rapid_peak: null,
    rapid_wins: 0,
    rapid_losses: 0,
    rapid_draws: 0,
    blitz_current: null,
    blitz_peak: null,
    blitz_wins: 0,
    blitz_losses: 0,
    blitz_draws: 0,
    bullet_current: null,
    bullet_peak: null,
    bullet_wins: 0,
    bullet_losses: 0,
    bullet_draws: 0,
    classical_current: null,
    classical_peak: null,
    classical_wins: 0,
    classical_losses: 0,
    classical_draws: 0,
    fide_rating: null,
    title: null,
    rating_history: {},
    recent_games: [],
    wins: 0,
    losses: 0,
    draws: 0,
    peak_rating: null,
    rapid_rating: null,
    blitz_rating: null,
    bullet_rating: null,
    classical_rating: null,
  };
}

export function parseChessCom(
  username: string,
  profileValue: unknown,
  statsValue: unknown,
  gamesValue: unknown,
): ChessSyncStats {
  const output = blankStats();
  const profile = record(profileValue);
  const stats = record(statsValue);

  for (const variant of VARIANTS) {
    const providerVariant = record(stats[`chess_${variant}`]);
    const last = record(providerVariant.last);
    const best = record(providerVariant.best);
    const gameRecord = record(providerVariant.record);
    output[`${variant}_current`] = numberOrNull(last.rating);
    output[`${variant}_peak`] =
      numberOrNull(best.rating) ?? output[`${variant}_current`];
    output[`${variant}_wins`] = Number(gameRecord.win ?? 0) || 0;
    output[`${variant}_losses`] = Number(gameRecord.loss ?? 0) || 0;
    output[`${variant}_draws`] = Number(gameRecord.draw ?? 0) || 0;
  }

  output.fide_rating = numberOrNull(profile.fide);
  output.title = textOrNull(profile.title);
  const games = Array.isArray(record(gamesValue).games)
    ? (record(gamesValue).games as unknown[])
    : [];
  output.recent_games = games
    .map((value) => parseChessComGame(username, value))
    .filter(Boolean) as RecentChessGame[];
  return finalize(output);
}

function parseChessComGame(
  username: string,
  value: unknown,
): RecentChessGame | null {
  const game = record(value);
  const white = record(game.white);
  const black = record(game.black);
  const isWhite =
    String(white.username ?? "").toLowerCase() === username.toLowerCase();
  const player = isWhite ? white : black;
  const opponent = isWhite ? black : white;
  if (!player.username || !opponent.username) return null;

  const providerResult = String(player.result ?? "");
  const result =
    providerResult === "win"
      ? "win"
      : [
            "agreed",
            "repetition",
            "stalemate",
            "insufficient",
            "50move",
            "timevsinsufficient",
          ].includes(providerResult)
        ? "draw"
        : "loss";
  const pgn = typeof game.pgn === "string" ? game.pgn : "";
  const opening =
    pgn
      .match(/\[ECOUrl "https?:\/\/[^"]+\/([^"/]+)"\]/)?.[1]
      ?.replaceAll("-", " ") ?? null;
  const endTime = numberOrNull(game.end_time);

  return {
    opponent: String(opponent.username),
    opponentRating: numberOrNull(opponent.rating),
    result,
    time_class: String(game.time_class ?? "unknown"),
    opening,
    date: endTime ? new Date(endTime * 1000).toISOString() : null,
    accuracy: null,
    url: textOrNull(game.url),
  };
}

export function parseLichess(
  username: string,
  userValue: unknown,
  historyValue: unknown,
  gamesValue: unknown[],
): ChessSyncStats {
  const output = blankStats();
  const user = record(userValue);
  const perfs = record(user.perfs);
  const count = record(user.count);

  for (const variant of VARIANTS) {
    const perf = record(perfs[variant]);
    output[`${variant}_current`] = numberOrNull(perf.rating);
    output[`${variant}_peak`] = output[`${variant}_current`];
  }

  output.title = textOrNull(user.title);
  output.wins = Number(count.win ?? 0) || 0;
  output.losses = Number(count.loss ?? 0) || 0;
  output.draws = Number(count.draw ?? 0) || 0;

  if (Array.isArray(historyValue)) {
    for (const rawSeries of historyValue) {
      const series = record(rawSeries);
      const variant = String(series.name ?? "").toLowerCase();
      if (
        !VARIANTS.includes(variant as Variant) ||
        !Array.isArray(series.points)
      )
        continue;
      const points = (series.points as unknown[]).flatMap((rawPoint) => {
        if (!Array.isArray(rawPoint) || rawPoint.length < 4) return [];
        const [year, zeroBasedMonth, day, rating] = rawPoint.map(Number);
        if (![year, zeroBasedMonth, day, rating].every(Number.isFinite))
          return [];
        return [
          {
            ts: new Date(Date.UTC(year, zeroBasedMonth, day)).toISOString(),
            r: rating,
          },
        ];
      });
      output.rating_history[variant] = points;
      const current = numberOrNull(output[`${variant}_current`]) ?? 0;
      const peak = Math.max(...points.map((point) => point.r), current);
      output[`${variant}_peak`] = peak || null;
    }
  }

  output.recent_games = gamesValue
    .map((game) => parseLichessGame(username, game))
    .filter(Boolean) as RecentChessGame[];
  return finalize(output);
}

function parseLichessGame(
  username: string,
  value: unknown,
): RecentChessGame | null {
  const game = record(value);
  const players = record(game.players);
  const white = record(players.white);
  const black = record(players.black);
  const whiteUser = record(white.user);
  const blackUser = record(black.user);
  const isWhite =
    String(whiteUser.name ?? whiteUser.id ?? "").toLowerCase() ===
    username.toLowerCase();
  const player = isWhite ? white : black;
  const opponent = isWhite ? black : white;
  const opponentUser = record(opponent.user);
  const winner = textOrNull(game.winner);
  const result = !winner
    ? "draw"
    : winner === (isWhite ? "white" : "black")
      ? "win"
      : "loss";
  const opening = record(game.opening);
  const createdAt = numberOrNull(game.createdAt);

  return {
    opponent: String(opponentUser.name ?? opponentUser.id ?? "Unknown"),
    opponentRating: numberOrNull(opponent.rating),
    result,
    time_class: String(game.speed ?? game.perf ?? "unknown"),
    opening: textOrNull(opening.name),
    date: createdAt ? new Date(createdAt).toISOString() : null,
    accuracy: numberOrNull(record(player.analysis).accuracy),
    url: game.id ? `https://lichess.org/${String(game.id)}` : null,
  };
}

export function mergeChessStats(sources: ChessSyncStats[]): ChessSyncStats {
  const output = blankStats();
  for (const source of sources) {
    for (const variant of VARIANTS) {
      output[`${variant}_current`] ??= source[`${variant}_current`];
      output[`${variant}_peak`] =
        Math.max(
          output[`${variant}_peak`] ?? 0,
          source[`${variant}_peak`] ?? 0,
        ) || null;
      output[`${variant}_wins`] += source[`${variant}_wins`];
      output[`${variant}_losses`] += source[`${variant}_losses`];
      output[`${variant}_draws`] += source[`${variant}_draws`];
      if (
        !output.rating_history[variant]?.length &&
        source.rating_history[variant]?.length
      ) {
        output.rating_history[variant] = source.rating_history[variant];
      }
    }
    output.fide_rating ??= source.fide_rating;
    output.title ??= source.title;
    output.recent_games.push(...source.recent_games);
    output.wins += source.wins;
    output.losses += source.losses;
    output.draws += source.draws;
  }
  output.recent_games = output.recent_games
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    .slice(0, 20);
  return finalize(output);
}

function finalize(stats: ChessSyncStats): ChessSyncStats {
  stats.rapid_rating = stats.rapid_current;
  stats.blitz_rating = stats.blitz_current;
  stats.bullet_rating = stats.bullet_current;
  stats.classical_rating = stats.classical_current;

  const variantWins = VARIANTS.reduce(
    (sum, variant) => sum + stats[`${variant}_wins`],
    0,
  );
  const variantLosses = VARIANTS.reduce(
    (sum, variant) => sum + stats[`${variant}_losses`],
    0,
  );
  const variantDraws = VARIANTS.reduce(
    (sum, variant) => sum + stats[`${variant}_draws`],
    0,
  );
  stats.wins ||= variantWins;
  stats.losses ||= variantLosses;
  stats.draws ||= variantDraws;
  stats.peak_rating =
    Math.max(...VARIANTS.map((variant) => stats[`${variant}_peak`] ?? 0)) ||
    null;
  return stats;
}
