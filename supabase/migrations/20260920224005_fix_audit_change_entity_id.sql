create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  old_data jsonb;
  new_data jsonb;
  row_data jsonb;
  resolved_entity_id text;
begin
  if tg_op <> 'INSERT' then
    old_data := to_jsonb(old);
  end if;

  if tg_op <> 'DELETE' then
    new_data := to_jsonb(new);
  end if;

  row_data := coalesce(new_data, old_data, '{}'::jsonb);
  resolved_entity_id := coalesce(
    row_data->>'id',
    row_data->>'user_id',
    row_data->>'character_id',
    row_data->>'campaign_id'
  );

  insert into public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  )
  values(
    (select auth.uid()),
    tg_op,
    tg_table_name,
    resolved_entity_id,
    old_data,
    new_data
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;
