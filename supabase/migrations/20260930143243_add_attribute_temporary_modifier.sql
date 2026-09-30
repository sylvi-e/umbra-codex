alter table public.character_stats
add column if not exists temporary_modifier numeric not null default 0;

comment on column public.character_stats.temporary_modifier is
  'Ajuste temporário independente aplicado ao modificador calculado do atributo.';

create or replace function public.duplicate_character(source_character_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
  src public.character_sheets;
begin
  if not private.can_view_character(source_character_id) then
    raise exception 'Acesso negado';
  end if;

  select * into src
  from public.character_sheets
  where id = source_character_id;

  insert into public.character_sheets(
    owner_id, campaign_id, template_id, name, portrait_url, true_name,
    true_name_meaning, true_name_effect, age, gender, pronouns, origin,
    birthplace, affiliation, occupation, physical_description, personality,
    backstory, objectives, private_notes, status, rank_name, class_name,
    soul_cores, max_soul_cores, soul_fragments, next_core_fragments,
    aspect_rank, soul_rank, lineage, aspect_legacy, corruption, visibility,
    is_npc
  ) values (
    (select auth.uid()), null, src.template_id, src.name || ' (cópia)',
    src.portrait_url, src.true_name, src.true_name_meaning, src.true_name_effect,
    src.age, src.gender, src.pronouns, src.origin, src.birthplace,
    src.affiliation, src.occupation, src.physical_description, src.personality,
    src.backstory, src.objectives, src.private_notes, src.status, src.rank_name,
    src.class_name, src.soul_cores, src.max_soul_cores, src.soul_fragments,
    src.next_core_fragments, src.aspect_rank, src.soul_rank, src.lineage,
    src.aspect_legacy, src.corruption, src.visibility, src.is_npc
  ) returning id into new_id;

  insert into public.character_stats(
    character_id, stat_key, label, category, base_value, temporary_bonus,
    temporary_modifier, penalty, current_value, max_value, notes, formula,
    sort_order, metadata
  )
  select new_id, stat_key, label, category, base_value, temporary_bonus,
    temporary_modifier, penalty, current_value, max_value, notes, formula,
    sort_order, metadata
  from public.character_stats
  where character_id = source_character_id;

  insert into public.character_traits(
    character_id, name, icon_url, rank_name, category, short_description,
    description, mechanical_effect, origin, activation_conditions, visibility,
    active, sort_order
  )
  select new_id, name, icon_url, rank_name, category, short_description,
    description, mechanical_effect, origin, activation_conditions, visibility,
    active, sort_order
  from public.character_traits
  where character_id = source_character_id;

  return new_id;
end;
$$;
