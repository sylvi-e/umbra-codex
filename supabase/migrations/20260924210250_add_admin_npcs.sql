alter table public.character_sheets
  add column is_npc boolean not null default false;

create or replace function private.can_view_character(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from public.character_sheets s
    where s.id = target_character_id
      and s.deleted_at is null
      and (
        (s.is_npc and private.is_admin())
        or (
          not s.is_npc
          and (
            s.owner_id = (select auth.uid())
            or private.is_admin()
            or (s.campaign_id is not null and private.is_campaign_master(s.campaign_id))
          )
        )
      )
  );
$$;

create or replace function private.can_edit_character(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from public.character_sheets s
    where s.id = target_character_id
      and s.deleted_at is null
      and (
        (s.is_npc and private.is_admin())
        or (
          not s.is_npc
          and (
            s.owner_id = (select auth.uid())
            or private.is_admin()
            or (s.campaign_id is not null and private.is_campaign_master(s.campaign_id))
          )
        )
      )
  );
$$;

drop policy sheets_insert on public.character_sheets;
create policy sheets_insert on public.character_sheets
for insert to authenticated
with check (
  (not is_npc and owner_id = (select auth.uid()))
  or private.is_admin()
);

drop policy sheets_update on public.character_sheets;
create policy sheets_update on public.character_sheets
for update to authenticated
using (private.can_edit_character(id))
with check (private.can_edit_character(id) and (not is_npc or private.is_admin()));

create or replace view public.character_summary
with (security_invoker = true)
as
select
  s.id, s.owner_id, s.campaign_id, s.name, s.true_name, s.portrait_url,
  s.status, s.rank_name, s.class_name, s.soul_cores, s.archived_at,
  s.updated_at, coalesce(h.current_value, 0) current_hp,
  coalesce(h.max_value, 0) max_hp,
  coalesce(e.current_value, 0) current_essence,
  coalesce(e.max_value, 0) max_essence,
  s.is_npc
from public.character_sheets s
left join public.character_stats h on h.character_id = s.id and h.stat_key = 'hp'
left join public.character_stats e on e.character_id = s.id and e.stat_key = 'essence'
where s.deleted_at is null;

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
  select * into src from public.character_sheets where id = source_character_id;
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
    penalty, current_value, max_value, notes, formula, sort_order, metadata
  )
  select new_id, stat_key, label, category, base_value, temporary_bonus,
    penalty, current_value, max_value, notes, formula, sort_order, metadata
  from public.character_stats where character_id = source_character_id;
  insert into public.character_traits(
    character_id, name, icon_url, rank_name, category, short_description,
    description, mechanical_effect, origin, activation_conditions, visibility,
    active, sort_order
  )
  select new_id, name, icon_url, rank_name, category, short_description,
    description, mechanical_effect, origin, activation_conditions, visibility,
    active, sort_order
  from public.character_traits where character_id = source_character_id;
  return new_id;
end;
$$;
