# KI-029 — Chess and football performance sync

Status: fixed in code; production deployment pending.

## Resolution

- Added authenticated `sync-chess` and `sync-football` Supabase Edge Functions.
- Chess imports public Chess.com and Lichess ratings, records, history, and recent games.
- Football imports the administrator-linked player from API-Football.
- Both functions derive identity from the authenticated athlete, enforce a cooldown, and commit provider data transactionally.
- Mobile and web now show provider-specific failures and preserve manual football entry as a fallback.
- Direct clients can no longer mark self-reported performance as externally verified.

## Production configuration

1. Apply `20260907212811_protect_external_performance_sources.sql`.
2. Set the Edge Function secret `API_FOOTBALL_KEY`.
3. Optionally set `CHESS_API_USER_AGENT` to an AceAiX support contact.
4. Deploy `sync-chess` and `sync-football` with JWT verification enabled.
5. Verify one linked chess athlete and one administrator-linked API-Football athlete.

Without `API_FOOTBALL_KEY`, football sync returns an expected fallback response telling the athlete to use manual statistics. Chess requires no provider secret.
