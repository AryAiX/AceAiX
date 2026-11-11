-- A club's own team no longer sees Follow on its page (QA-157), so a follow
-- made before that could never be undone. organization_follows_sync_count
-- recounts followers_count on delete.
delete from public.organization_follows f
using public.organization_members m
where m.organization_id = f.organization_id
  and m.user_id = f.follower_id
  and m.status = 'active';
