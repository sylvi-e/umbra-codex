create or replace function public.adjust_character_temporary_hp(
  target_character_id uuid,
  amount numeric
) returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  old_row public.character_stats;
  new_row public.character_stats;
begin
  if not private.can_edit_character(target_character_id) then
    raise exception 'Acesso negado';
  end if;

  select *
  into old_row
  from public.character_stats
  where character_id = target_character_id
    and stat_key = 'hp'
  for update;

  if not found then
    raise exception 'Recurso não encontrado';
  end if;

  update public.character_stats
  set temporary_bonus = greatest(0, coalesce(temporary_bonus, 0) + amount)
  where id = old_row.id
  returning * into new_row;

  insert into public.character_history(
    character_id,
    actor_id,
    event_type,
    field_key,
    old_value,
    new_value
  )
  values (
    target_character_id,
    (select auth.uid()),
    case
      when amount < 0 then 'temporary_hp_spent'
      else 'temporary_hp_gained'
    end,
    'temporary_hp',
    to_jsonb(old_row.temporary_bonus),
    to_jsonb(new_row.temporary_bonus)
  );
end
$$;

revoke all on function public.adjust_character_temporary_hp(uuid, numeric)
from public, anon;

grant execute on function public.adjust_character_temporary_hp(uuid, numeric)
to authenticated;
