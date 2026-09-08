import { assertEquals } from "jsr:@std/assert@1";
import {
  mergeChessStats,
  parseChessCom,
  parseLichess,
} from "../_shared/chess.ts";
import { parseApiFootballResponse } from "../_shared/football.ts";

Deno.test("Chess.com parser maps ratings, records, and recent games", () => {
  const stats = parseChessCom(
    "athlete",
    { title: "FM", fide: 2310 },
    {
      chess_rapid: {
        last: { rating: 2100 },
        best: { rating: 2200 },
        record: { win: 12, loss: 4, draw: 2 },
      },
    },
    {
      games: [
        {
          white: { username: "athlete", rating: 2100, result: "win" },
          black: { username: "rival", rating: 2050, result: "checkmated" },
          time_class: "rapid",
          end_time: 1_700_000_000,
          url: "https://chess.com/game/1",
        },
      ],
    },
  );

  assertEquals(stats.rapid_current, 2100);
  assertEquals(stats.rapid_peak, 2200);
  assertEquals(stats.rapid_wins, 12);
  assertEquals(stats.wins, 12);
  assertEquals(stats.title, "FM");
  assertEquals(stats.recent_games[0].result, "win");
});

Deno.test(
  "Lichess parser maps perfs and zero-based rating-history months",
  () => {
    const stats = parseLichess(
      "athlete",
      {
        perfs: { blitz: { rating: 1950 } },
        count: { win: 20, loss: 10, draw: 5 },
      },
      [
        {
          name: "Blitz",
          points: [
            [2026, 0, 15, 1900],
            [2026, 1, 15, 1980],
          ],
        },
      ],
      [],
    );

    assertEquals(stats.blitz_current, 1950);
    assertEquals(stats.blitz_peak, 1980);
    assertEquals(
      stats.rating_history.blitz[0].ts.startsWith("2026-01-15"),
      true,
    );
    assertEquals(stats.wins, 20);
  },
);

Deno.test(
  "chess provider merge prefers the first current rating and keeps the highest peak",
  () => {
    const chessCom = parseChessCom(
      "a",
      {},
      {
        chess_blitz: {
          last: { rating: 1800 },
          best: { rating: 1900 },
          record: {},
        },
      },
      {},
    );
    const lichess = parseLichess(
      "a",
      { perfs: { blitz: { rating: 2000 } }, count: {} },
      [{ name: "Blitz", points: [[2026, 0, 1, 2050]] }],
      [],
    );
    const merged = mergeChessStats([chessCom, lichess]);

    assertEquals(merged.blitz_current, 1800);
    assertEquals(merged.blitz_peak, 2050);
    assertEquals(merged.blitz_rating, 1800);
  },
);

Deno.test(
  "API-Football parser aggregates competitions and weights ratings",
  () => {
    const stats = parseApiFootballResponse({
      response: [
        {
          player: { id: 42, name: "Athlete" },
          statistics: [
            {
              team: { name: "Ace FC" },
              league: { name: "League" },
              games: { appearences: 10, minutes: 800, rating: "7.50" },
              goals: { total: 4, assists: 3 },
              shots: { total: 20, on: 12 },
              passes: { accuracy: "84%" },
              dribbles: { success: 8 },
              tackles: { total: 12 },
              cards: { yellow: 2, red: 0 },
            },
            {
              team: { name: "Ace FC" },
              league: { name: "Cup" },
              games: { appearences: 2, minutes: 90, rating: "8.00" },
              goals: { total: 1, assists: 0 },
              shots: { total: 3, on: 2 },
              passes: { accuracy: "80%" },
              dribbles: { success: 1 },
              tackles: { total: 2 },
              cards: { yellow: 0, red: 0 },
            },
          ],
        },
      ],
    });

    assertEquals(stats.appearances, 12);
    assertEquals(stats.goals, 5);
    assertEquals(stats.assists, 3);
    assertEquals(stats.rating, 7.58);
    assertEquals(stats.shots_per_game, 1.92);
    assertEquals(stats.team, "Ace FC");
  },
);
