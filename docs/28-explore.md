# 28 — Explore

> Discover has an Explore view for every role: a mosaic of every public clip, the way a photo app's
> explore page works. Source of truth: `supabase/migrations/20261007000001_explore.sql`. Client:
> `mobile/components/explore/`, `mobile/lib/explore.ts`, `mobile/lib/api.explore.ts`,
> `mobile/app/(tabs)/discover.tsx`.

---

## 1. What is on it

| Source | Table | Shown as |
|--------|-------|----------|
| Video posts | `posts`, with a video in `media` | `type` as posted (`video`, …) |
| Highlight clips | `athlete_media`, `video` or `highlight_reel` | `type = 'highlight'` |

A highlight that was also shared as a post appears once, as the post.

**Public only.** Explore is for people you do not follow yet, so a followers-only or connections-only
post never appears, not even to a follower. The feed is where those are read.

Every other gate is one the feed or the profile already applies:

- a suspended author, a hidden post and a post held by moderation are left out;
- a block in either direction hides the author's clips;
- a minor whose guardian has not approved discovery reaches nobody (`viewer_can_see_author`);
- a minor's highlight also needs the guardian's "photos and clips" scope
  (`viewer_can_see_public_media`).

## 2. The functions

- `private.visible_highlight_clips()` is the one definition of which profile clips a viewer may
  watch. Explore and Reels both read it; a client cannot call it.
- `get_reels` now also returns those profile clips (docs/27 §2), so a video uploaded to a profile
  plays in Reels and on the Home strip, not only on the profile.

- `explore_videos(p_limit, p_offset, p_sport)` returns rows in the feed's shape, so the reels pager
  plays them without a second player. Order: newest first, lifted by views and likes
  (`created_at + ln(1 + views + 3·likes) × 3 h`), with the id as a tie-break so offset paging is
  stable. The limit is capped at 60.
- `explore_sports()` returns the sports this viewer would get at least one clip for, with counts.
  It reads through `explore_videos`, so a chip never leads to an empty grid.

## 3. The screen

| Role | Where Explore is | Opens on |
|------|------------------|----------|
| Athlete, guardian, anyone not recruiting | The first of four tabs: **Explore**, Clubs, Coaches, Leaderboard | Explore |
| Coach, scout, club, federation | An underlined tab beside **Athletes** (their search, unchanged) | Athletes |

For an athlete the search bar stays under the tabs on every tab. On Explore it opens the
people-and-clubs search (`/search`), since clips are not searched by text.

`/discover?view=explore` and `/discover?view=people` open a given side.

**The grid** (`lib/explore.ts`, unit-tested): three columns. Every other row is a feature row, with
one large tile (two columns, two rows) and two small ones; the large tile swaps sides each time.

- Tiles are posters. Only the large tile of a row on screen plays, muted, as a preview; it stops
  when the tab is left and is off under "reduce motion".
- Each tile shows a play mark and the view count. A large tile also shows the author and caption.
  A highlight carries a "Highlight" tag.
- Sport chips appear when there is more than one sport to choose from.
- It pages 18 clips at a time, with pull-to-refresh, a skeleton, an empty state and an error state.

**Tapping a tile** opens `/reels?source=explore&start=<id>` (plus `sport` when a chip is on): the
reels pager, loaded with the same grid. A highlight plays there without like, comment or share,
because those belong to posts. Follow and the profile link work for both.

`ExploreGrid` takes a `source`. `explore` is this screen. `reels` fills the same mosaic from
`get_reels` for `/clips`, the collection behind "See all" on Home (docs/27).

The athlete's tabs are now a scrolling row (`ScrollTabs`): Explore, Clubs, Coaches, Sponsors,
Leaderboard. A SegmentedControl stops fitting at five labels.

## 4. Demo media

`tools/local-supabase/demo-media/generate.py` now draws nine clips. The seed points the highlight
rows and two new video posts at them, so the local grid has ten tiles across four sports.

## 5. Tests

- `supabase/tests/functional.sql` → "explore": 21 assertions, six of them for profile clips in Reels. Public post in, followers-only out
  (even for a follower), photo out, public highlight in and private out, hidden minor out, blocks
  both ways, hidden post out, paging, the sport filter, the chips, and no anonymous access.
- `mobile/tests/unit/explore.test.ts`: the mosaic pattern, tile sizes, page merging.
- `mobile/tests/e2e/pipelines.mjs`: a coach who posts nothing gets the grid; chip counts match it.

## 6. Open items

1. Views are shown but watching a clip in the pager does not count one yet. Highlights have a
   stored `views_count`; posts have `view_count`. A view event from the pager would feed both, and
   the ranking.
2. Ranking is recency plus popularity. It does not yet use the viewer's sport or who they follow.
3. Offset paging can skip or repeat a clip when new ones arrive mid-scroll. The client drops
   repeats. A keyset cursor is the fix if the grid gets busy.
4. A minor's video **post** follows the feed's rule (discovery consent). Only highlights check the
   media scope. Worth a decision on whether posts should check it too.
