-- Profile photos and covers live in the public 'avatars' bucket.
-- Opening a known file URL does not use row-level security (public bucket),
-- so photos keep loading everywhere. But the old read policy also let anyone
-- (even signed-out, with the public key) LIST every file in the bucket,
-- exposing every user id and photo URL, including hidden minors'.
-- Now a signed-in user can only list/read their own folder through the API.
-- Admins keep access through the existing media_admin_read policy.

drop policy if exists avatars_public_read on storage.objects;

drop policy if exists avatars_owner_read on storage.objects;
create policy avatars_owner_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);