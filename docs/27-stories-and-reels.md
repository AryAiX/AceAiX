# 27 — Stories and Reels

> Stories are 24-hour posts shown as a rail of rings at the top of Home. Reels are the video posts
> that already existed, played full-screen and vertical. Source of truth:
> `supabase/migrations/20260925000001_stories_and_reels.sql`. Client: `mobile/app/stories/`,
> `mobile/app/reels.tsx`, `mobile/components/stories/`, `mobile/components/reels/`,
> `mobile/lib/api.stories.ts`, `mobile/lib/api.reels.ts`.

---

## 1. Stories

| Kind | What it is | Upload |
|------|------------|--------|
| `card` | Text on one of the app's gradients, with a sport sticker and an optional big number ("2–1", "2:09") | none |
| `photo` | An image from the library | `stories/<uid>/<id>.<ext>` |
| `video` | A short clip | `stories/<uid>/<id>.<ext>` |

Most athletes will post a result or a PB, so the card needs no photo and renders natively.

**Rail order:** your own first, then people you follow with something new, then people you follow
you have caught up with. Verified coaches, clubs, scouts and the federation also appear when their
story is public, so a new player with three follows does not open the app to an empty rail.

**Viewer:** progress bars along the top; 5 s a photo or card, a video's own length up to 15 s.
Tap right or left to move, hold to pause, swipe down to close; it rolls on to the next author in rail
order. The author sees how many people watched and can delete a story.

**Composer** (`/stories/new`): Card (background, text up to 140 characters, sticker, number, live
preview) or Photo, plus an audience.

### Who can see a story

`private.viewer_can_see_story()` is the one predicate. The read policy and every RPC use it:

- the author always sees their own;
- otherwise, the story has not expired, the author passes `viewer_can_see_author` (so a minor
  whose guardian has not approved discovery reaches nobody), there is no block in either direction,
  and the audience admits the viewer (`public`, `followers`, or `connections` = mutual follow).

Before this migration the prototype's policy let any signed-in account read any unexpired story. The
`stories` storage bucket decides who may fetch an image by asking whether that row is visible, so
the policy had to change before the first story could be posted.

### Writing

Only `create_story` writes, since direct `INSERT`/`UPDATE` are revoked. It checks:

- the kind and the audience;
- a card has text of 140 characters or fewer, and only the keys the app renders are kept;
- a photo or video points into the author's own folder (`story_media_missing`);
- a minor needs the guardian's "photos and clips" scope for a photo or video
  (`guardian_consent_required`);
- no more than 30 stories in 24 hours.

`mark_story_viewed` is silent for a story you cannot see, so its answer reveals nothing.

## 2. Reels

`get_reels` returns two things, newest first:

- the feed's posts that have a video (`get_feed`, so audience, blocks, suspension and the minor gate
  all apply without being written twice);
- the public clips athletes uploaded to their own page (`athlete_media`), since 1007/01. They come
  through `private.visible_highlight_clips()`, the helper Explore uses (docs/28). A profile clip has
  `type = 'highlight'` and plays without like, comment or share, which belong to posts.

The screen (`/reels`) is a vertical pager:

- Only the visible clip plays. It loops and starts muted, with a sound button.
- The poster shows until the first frame.
- Double-tap to like, with a heart burst.
- Like, comment, share and follow sit down the right side.
- Home has a Reels button in the header and a strip of reel posters. A poster plays that reel;
  **See all** opens `/clips`, the whole reels feed as a grid (the Explore mosaic, docs/28), and a
  tile there opens the pager at that clip.

A video post in the feed keeps its poster when the platform cannot decode the clip, instead of
showing an empty frame.

## 3. Demo media

`tools/local-supabase/demo-media/generate.py` draws short vertical clips (football, athletics,
basketball, swimming; nine since Explore, docs/28) and three stills from scratch, so nothing in the repo is somebody else's footage. The
seed points seven stories and four posts at them.

- **Local harness:** the stand-in serves these files for the matching storage paths. It also
  answers batch signing (`POST /object/sign/<bucket>` with `{ paths }`). Before, it treated batch
  signing as an upload, which crashed the feed with "e.map is not a function".
- **Preview build:** `build-preview.mjs` rewrites each quoted demo path in the recorded answers into
  a `data:` URI. The app loads it as is (`lib/mediaUrl.ts`).

## 4. Tests

- `supabase/tests/functional.sql` → "stories and reels": 13 assertions. They cover card sanitising,
  the own-folder rule, no writes around the RPC, visibility and view counts, a hidden minor seen by
  nobody (via the RPC and via the table), blocks, rail order, deletion, and `get_reels`.
- `mobile/tests/unit/stories.test.ts`: story timing, advance and absolute-URL logic.

## 5. Open items

1. Expired stories are purged by `purge_expired_stories()`, which needs a scheduled job.
2. Video stories are capped at 15 s in the viewer, but upload length is not checked on the server.
3. Reels are ordered like "For you"; a dedicated ranking (watch time, completion) would need view
   events that are not recorded yet.
