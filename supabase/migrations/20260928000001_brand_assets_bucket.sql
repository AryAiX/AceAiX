-- Public, read-only bucket for brand assets referenced from outside the app:
-- the logo in the Auth emails, for one. The websites cannot be relied on for
-- this (the SPA answers every path with index.html), and an email image must
-- resolve for as long as the email sits in an inbox.
--
-- No insert/update/delete policies on purpose: only the service role writes
-- here. Public buckets serve object downloads without RLS, so no select
-- policy is needed either.
--
-- Upload after applying:
--   tools/auth-emails/build.mjs --push <ref> uploads aceaix-mark.png itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 2097152, array['image/png', 'image/svg+xml', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
