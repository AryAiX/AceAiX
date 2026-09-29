-- An athlete withdrawing or re-applying was notified about their own action
-- ("Your application ... is now withdrawn"), while the poster heard nothing
-- about a re-application. Status notices now go to the other party.
create or replace function private.on_application_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare o record;
begin
  select * into o from public.opportunities where id = coalesce(new.opportunity_id, old.opportunity_id);
  if not found then return coalesce(new, old); end if;

  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and new.status is distinct from old.status
         and new.status = 'applied' and auth.uid() = new.athlete_id) then
    perform private.notify(
      o.created_by_id, 'application', 'application_received',
      private.display_name(new.athlete_id) || ' applied to ' || o.title,
      null, new.athlete_id, 'opportunity', o.id::text, null,
      jsonb_build_object('opportunity_id', o.id, 'application_id', new.id)
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status
        and auth.uid() is distinct from new.athlete_id then
    perform private.notify(
      new.athlete_id, 'application', 'application_status',
      'Your application to ' || o.title || ' is now ' || new.status,
      null, o.created_by_id, 'opportunity', o.id::text, null,
      jsonb_build_object('opportunity_id', o.id, 'application_id', new.id, 'status', new.status)
    );
  end if;

  return coalesce(new, old);
end;
$$;
