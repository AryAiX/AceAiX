# 25 — Web / Mobile V2 Parity

This is the acceptance contract for the AceAiX product application on the web.
It replaces any earlier use of “parity” that meant only shared backend rules,
roles, colours, or broad feature categories.

## 1. Definition

For every routable screen in `mobile/app`, web must use the same source and
provide the same:

- information architecture, copy, controls, icons, type, colour, spacing,
  hierarchy and motion;
- navigation, forms, validation, mutations, permissions and role behavior;
- loading, empty, error, retry, offline, blocked, restricted and suspended
  states;
- minor/adult and guardian-consent behavior;
- light/dark themes, all seven locales, and right-to-left layout;
- backend contract, realtime updates, optimistic behavior and rollback.

“It renders” is not parity. A screen is complete only after its states and
actions in `mobile/tests/parity/screenManifest.ts` pass in a browser.
Browser-only capability gaps and their acceptance tests live beside it in
`mobile/tests/parity/platformManifest.ts`.

## 2. One product implementation

The product application is the Expo Router application in `mobile/`. It targets
iOS, Android and web from the same screen and component source. The web build is
produced with:

```sh
cd mobile
npm run build:web
```

Do not create or restyle a second implementation of a mobile product screen in
`web/src/pages`. Two independently maintained implementations cannot meet this
contract because they can pass a visual review once and drift on the next
feature.

## 3. Web-native surfaces

`web/` remains a separate Vite application only for surfaces that do not exist
in Mobile V2:

- indexable marketing and public acquisition pages;
- canonical public legal and account-deletion URLs;
- indexable public athlete, coach, club and organization pages;
- desktop administration, moderation, verification and medical-partner tools.

Those surfaces use V2’s brand language, but they are not falsely counted as
mobile parity because Mobile V2 has no corresponding screen.

The authenticated athlete, guardian and recruiter product experience is served
from the Expo web build at `dev.aceaix.com` during V2 staging. `aceaix.com`
remains the indexable Vite surface. No second product-app hostname is required.

## 4. Responsive acceptance

The same source must pass at all viewports declared in the parity manifest:

- 390 × 844 mobile;
- 768 × 1024 tablet;
- 1440 × 900 desktop.

At the mobile viewport the browser rendering must match the native screen.
Tablet and desktop may reflow the same content, but may not remove actions,
change behavior, or introduce a second component tree that can drift.

## 5. Platform adapters

Native capabilities require explicit browser equivalents. An unavailable
native API is not permission to hide the feature.

Examples include media capture/picking, video playback, share and clipboard,
file export/download, push permission and browser settings, date picking,
hardware-back/discard behavior, safe areas, deep links and RTL restart
behavior. Every adapter must have a browser acceptance test and any unavoidable
browser limitation must be recorded in the parity manifest before release.

## 6. Enforcement

`tests/unit/screenParity.test.ts` compares the manifest against the Expo Router
file tree. A new or removed route therefore fails CI until the acceptance
inventory changes with it.

The manifest’s `coverage` field is deliberately explicit:

- `unverified`: no adequate browser evidence;
- `render-only`: the screen rendered, but its required states/actions did not
  all pass;
- `verified`: every listed browser case passed.

The release gate is zero `unverified` and zero `render-only` entries, plus the
mobile, browser, database and accessibility regression suites. The platform
manifest must also contain zero `blocked` and zero `unverified` entries. A
walkthrough count smaller than the route manifest is a failure, not a release
note.

## 7. Dev and production promotion

The final `deploy-web` job in `.github/workflows/ci.yml` owns
`dev.aceaix.com`:

- a same-repository pull request is deployed only after Source hygiene, Web,
  Mobile and Backend all pass; the most recently green PR becomes the stable
  dev deployment;
- fork pull requests run CI without receiving deployment credentials;
- a push to `main` follows the same gate, creates a Vercel production
  deployment and pins `dev.aceaix.com` back to that main commit;
- the deployed PR artifact is GitHub's tested merge commit, not an untested
  branch tip.

CI needs the following GitHub repository secrets, all set against the `aryaix`
Vercel team:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The deployment job is skipped unless the GitHub repository variable
`VERCEL_DEPLOY_ENABLED` is `true`, so the workflow can never make an otherwise
valid pull request fail while the credentials are being rotated.

### Project separation

The Expo build deploys to the `aceaix-v2` Vercel project, which is deliberately
separate from the `aceaix` project:

- `aceaix-v2` owns `dev.aceaix.com` only. Its Root Directory is empty because
  CI runs the Vercel CLI from inside `mobile/`, and `mobile/vercel.json`
  supplies the build command, output directory and SPA rewrites.
- `aceaix` still owns `aceaix.com` and `www.aceaix.com` and still serves the
  Vite web app. Nothing in this workflow deploys to it.

Because the two are separate projects, a push to `main` promotes the Expo build
to production within `aceaix-v2` and cannot replace the live marketing site.
Retiring the Vite app on `aceaix.com` is a separate, explicit decision.

`aceaix-v2` defines `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` for Production, Preview and Development. Its
deployment protection is `all_except_custom_domains`, so raw `*.vercel.app`
preview URLs require team login while `dev.aceaix.com` stays public. No Git
repository is connected to either project, because GitHub Actions owns both
promotion and the stable alias.
