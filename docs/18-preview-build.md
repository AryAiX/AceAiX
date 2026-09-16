# 18 — The preview build

> One HTML file that contains the whole app and behaves like it, with nothing behind it.
>
> It exists for the case where somebody has to *see* AceAiX right now — on a phone, in a meeting,
> on a laptop with no toolchain — and installing Expo Go, cloning the repo and standing up a
> backend is three steps too many.

---

## 1. What it is

`npm run preview` produces `mobile/preview.html`: the production web bundle, the fonts, and a
recording of every API call the app makes against the local harness, inlined into a single file.
Opened anywhere, it signs in, loads a feed, opens profiles, walks the Talent Score, browses trials
and reads a conversation — because it is the real app, not a mockup, and the answers it gets are
the ones the real backend gave.

It is a preview, not a deployment. Two consequences worth saying out loud:

- **Writes are acknowledged, not stored.** Liking a post replays the recorded response. Reload and
  the like is back where it started.
- **It only knows the questions we asked.** A screen the recording never visited gets an empty list
  and shows its empty state. Nothing breaks; it just has nothing to show.

Everything else is genuine — the same navigation, the same animations, the same language gate, the
same light and dark themes.

---

## 2. Building one

```bash
./tools/local-supabase/start.sh            # the harness the recording is taken from
cd mobile
npm run preview                            # export → record → bake
npm run preview:check                      # sign in and walk it with the network cut
```

Three steps, three files:

| Step | Script | What it does |
|------|--------|--------------|
| export | `expo export --platform web` | The production bundle, in `dist/` |
| record | `tests/e2e/record-demo.mjs` | Signs in as all four demo accounts, tours ~44 routes each, writes every exchange to `tests/e2e/recordings.json`, keyed by *(user, method, path, body)* so two accounts asking the same question keep their own answers |
| bake | `tests/e2e/build-preview.mjs` | Inlines the bundle, subsets the eight font faces to the scripts the app renders and converts them to WOFF2, and writes the replay layer in front of `fetch` |

`tests/e2e/check-preview.mjs` is the proof: it serves the file the way a static host would, fails
on **any** request that tries to leave the page, and taps through sign-in, the feed, notifications,
messages, the streak sheet, discovery, trials, the profile and the score.

---

## 3. How the replay layer works

A single `window.fetch` wrapper, installed before the bundle runs, with four things to get right.

**Whose answer.** The key includes the caller's user id, read from the JWT on the request, so
Layla's feed and Marco's feed do not collide. Lookup falls back from exact *(user, path, body)* to
*(user, path)* to *(anyone, path, body)* — and stops there. It never falls back to the path alone:
answering a request for one post's comments with another post's would render a thread whose parents
are missing, which is worse than an empty screen.

**Sessions that do not expire.** The harness mints tokens on a real schedule. The replay stretches
`expires_at` a year out, so the client never starts chasing a refresh it cannot complete.

**The address bar, twice.** One file is hosted at one address, so the router is
allowed to navigate but not to rewrite the URL — otherwise a refresh on
`/discover` lands on a path the host has never heard of.

The subtler half: the app routes on `location.pathname`, and a hosted page
rarely lives at the origin root. Served at `/code/artifact/<id>`, the router
booted at a path matching no route and dropped onto the app's own "this page has
moved on" screen the instant the language gate handed over. So the runtime boots
the router at `/`, restores the real address once it has been read, and pins it
there. `popstate` is swallowed, because with the address pinned the only path a
back gesture could make the router re-read is the host's own.

`check-preview.mjs` never caught this, because it serves the page for every
path — convenient, and wrong. `check-hosted.mjs` serves it at exactly one
sub-path and 404s the rest, which is what a host actually does:

```bash
node tests/e2e/check-hosted.mjs preview.html --base /code/artifact/abc123
node tests/e2e/check-hosted.mjs preview.html --base /        # the other shape
```

**Realtime.** `WebSocket` is stubbed closed. Nothing is listening, and an unreachable socket would
retry for ever.

---

## 4. Size

A phone on mobile data has to download the whole thing, and hosts have limits, so the bake keeps
it small:

| | Before | After |
|---|--------|-------|
| JS bundle | 5.2 MB | 3.4 MB — see below |
| Fonts | 2.7 MB (8 full TTFs, base64) | 0.5 MB (subset, WOFF2, base64) |
| Recordings | 0.33 MB | 0.33 MB |

The bundle saving is not a preview trick — it is `scripts/slim-lucide.js`, which now runs from
`metro.config.js` on **every** build. `lucide-react-native` is one barrel over about fifteen hundred
icons and Metro does not tree-shake, so importing three icons pulled in all of them: roughly two
megabytes of SVG path data that no screen ever rendered, downloaded and parsed on every cold start.
The script reads the package's own export map, finds the icons the source imports by name, and
generates a barrel with just those — 98 of 5,585 exported names today. It regenerates on each start,
so adding an icon to a screen needs no thought and it cannot go stale.

---

## 5. Related documents

- [14 — Local Development](14-local-development.md) — the harness the recording is taken from, and
  how to run the app in Expo Go on a real phone
- [10 — Mobile App](10-mobile-app.md) — the screens the preview walks
- [16 — Internationalisation](16-internationalisation.md) — the language gate the preview opens on
