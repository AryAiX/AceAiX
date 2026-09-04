-- Notify the recipient when someone follows them
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  follower_name text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  select full_name into follower_name
  from public.user_profiles
  where id = new.follower_id;

  insert into public.notifications (user_id, type, title, body, data, is_read, read)
  values (
    new.following_id,
    'connection',
    coalesce(follower_name, 'Someone') || ' connected with you',
    coalesce(follower_name, 'An AceAiX member') || ' is now following you.',
    jsonb_build_object('follower_id', new.follower_id),
    false,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
after insert on public.follows
for each row
execute function public.notify_on_follow();

-- Notify the other conversation participant when a message is sent
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  recipient_id uuid;
  sender_name text;
  preview text;
begin
  select
    case when c.participant_1_id = new.sender_id then c.participant_2_id else c.participant_1_id end
  into recipient_id
  from public.conversations c
  where c.id = new.conversation_id;

  if recipient_id is null or recipient_id = new.sender_id then
    return new;
  end if;

  select full_name into sender_name
  from public.user_profiles
  where id = new.sender_id;

  preview := left(coalesce(new.content, ''), 120);

  insert into public.notifications (user_id, type, title, body, data, is_read, read)
  values (
    recipient_id,
    'message',
    coalesce(sender_name, 'Someone') || ' sent you a message',
    preview,
    jsonb_build_object('memberId', new.sender_id, 'conversationId', new.conversation_id),
    false,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message
after insert on public.messages
for each row
execute function public.notify_on_message();

-- Notify the post author when someone likes their post
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  post_author_id uuid;
  liker_name text;
begin
  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is null or post_author_id = new.user_id then
    return new;
  end if;

  select full_name into liker_name
  from public.user_profiles
  where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, data, is_read, read)
  values (
    post_author_id,
    'like',
    coalesce(liker_name, 'Someone') || ' liked your post',
    coalesce(liker_name, 'An AceAiX member') || ' liked one of your posts.',
    jsonb_build_object('post_id', new.post_id),
    false,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_like on public.post_likes;
create trigger trg_notify_on_like
after insert on public.post_likes
for each row
execute function public.notify_on_like();

-- Notify the post author when someone comments on their post
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  post_author_id uuid;
  commenter_name text;
  preview text;
begin
  select author_id into post_author_id
  from public.posts
  where id = new.post_id;

  if post_author_id is null or post_author_id = new.author_id then
    return new;
  end if;

  select full_name into commenter_name
  from public.user_profiles
  where id = new.author_id;

  preview := left(coalesce(new.body, ''), 120);

  insert into public.notifications (user_id, type, title, body, data, is_read, read)
  values (
    post_author_id,
    'comment',
    coalesce(commenter_name, 'Someone') || ' commented on your post',
    preview,
    jsonb_build_object('post_id', new.post_id),
    false,
    false
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_on_comment on public.post_comments;
create trigger trg_notify_on_comment
after insert on public.post_comments
for each row
execute function public.notify_on_comment();