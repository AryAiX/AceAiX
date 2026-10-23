-- App version record for the "Update available" pop-up (QA-110)
--
-- platform_settings is readable by everyone (anon included) and writable
-- only by admins (0007_ai_content_admin.sql), so the app can read this
-- before sign-in without a new policy.
--
-- latest:    the newest version in the store. Older apps are offered an
--            update they can postpone.
-- minimum:   optional. Apps older than this must update (no "Later").
-- store_url: where the Update button goes.
--
-- Seeded with the current version, so nobody is prompted until someone
-- raises "latest" after a release. "on conflict do nothing" keeps any
-- value already set.

insert into public.platform_settings (key, value)
values (
  'app_version',
  jsonb_build_object(
    'ios', jsonb_build_object(
      'latest',    '2.0.5',
      'minimum',   null,
      'store_url', 'https://apps.apple.com/app/id6785269968'
    ),
    'android', jsonb_build_object(
      'latest',    '2.0.5',
      'minimum',   null,
      'store_url', 'https://play.google.com/store/apps/details?id=com.aryaix.aceaix.athlete'
    )
  )
)
on conflict (key) do nothing;