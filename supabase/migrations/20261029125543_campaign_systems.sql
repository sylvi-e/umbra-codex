-- Additive migration: preserve sheet IDs and every existing child record.
create table private.campaign_migration_backup_20261029 (table_name text primary key, rows jsonb not null);
revoke all on private.campaign_migration_backup_20261029 from public, anon, authenticated;
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' and (tablename like 'character_%' or tablename in ('campaigns','campaign_members','inventory_items','aspect_abilities','memory_enchantments','echo_stats','echo_abilities')) loop
 execute format('insert into private.campaign_migration_backup_20261029 select %L, coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t',t,t);
 end loop;
end $$;
alter table public.campaigns add column system_key text not null default 'shadow_slave' check(system_key in ('shadow_slave','organization'));
alter table public.character_sheets add column system_key text not null default 'shadow_slave' check(system_key in ('shadow_slave','organization'));
alter table public.character_sheets add column organization_data jsonb not null default '{}'::jsonb check(jsonb_typeof(organization_data)='object');
-- Existing hub: when there is exactly one campaign, retain that campaign as the legacy home.
-- In other installations, give each owner a private legacy campaign instead.
do $$ declare legacy uuid; r record; begin
 if (select count(*) from public.campaigns)=1 then
  select id into legacy from public.campaigns;
  update public.character_sheets set campaign_id=legacy where campaign_id is null;
 else
  for r in select distinct owner_id from public.character_sheets where campaign_id is null loop
   insert into public.campaigns(owner_id,name,system_key) values(r.owner_id,'Minha campanha — Shadow Slave','shadow_slave') returning id into legacy;
   update public.character_sheets set campaign_id=legacy where campaign_id is null and owner_id=r.owner_id;
  end loop;
 end if;
 insert into public.campaign_members(campaign_id,user_id,role) select id,owner_id,'master' from public.campaigns on conflict do nothing;
 insert into public.campaign_members(campaign_id,user_id,role) select distinct campaign_id,owner_id,'player'::public.member_role from public.character_sheets where campaign_id is not null on conflict do nothing;
end $$;
create function private.is_campaign_member(target uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (exists(select 1 from public.campaigns where id=target and owner_id=auth.uid()) or exists(select 1 from public.campaign_members where campaign_id=target and user_id=auth.uid()));
$$;
revoke all on function private.is_campaign_member(uuid) from public;
grant execute on function private.is_campaign_member(uuid) to authenticated;
create or replace function private.can_view_character(target_character_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.character_sheets s where s.id=target_character_id and s.deleted_at is null and
 (private.is_admin() or private.is_campaign_master(s.campaign_id) or (not s.is_npc and s.owner_id=auth.uid() and (s.campaign_id is null or private.is_campaign_member(s.campaign_id)))));
$$;
create or replace function private.can_edit_character(target_character_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select private.can_view_character(target_character_id);
$$;
drop policy sheets_insert on public.character_sheets;
create policy sheets_insert on public.character_sheets for insert to authenticated with check (
 owner_id=(select auth.uid()) and campaign_id is not null and private.is_campaign_member(campaign_id) and (not is_npc or private.is_campaign_master(campaign_id) or private.is_admin())
);
drop policy sheets_update on public.character_sheets;
create policy sheets_update on public.character_sheets for update to authenticated using(private.can_edit_character(id)) with check(
 private.can_edit_character(id) and (not is_npc or private.is_campaign_master(campaign_id) or private.is_admin())
);
create function private.protect_campaign_system() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if tg_table_name='campaigns' then
  if new.system_key is distinct from old.system_key then raise exception 'O sistema da campanha não pode ser alterado'; end if;
 else
  if tg_op='UPDATE' then
   if new.system_key is distinct from old.system_key or new.is_npc is distinct from old.is_npc or (new.campaign_id is distinct from old.campaign_id and (new.campaign_id is not null or exists(select 1 from public.campaigns where id=old.campaign_id))) then raise exception 'Sistema, tipo e campanha da ficha não podem ser alterados'; end if;
  end if;
  if new.campaign_id is not null then
   select system_key into new.system_key from public.campaigns where id=new.campaign_id;
   if new.system_key is null then raise exception 'Campanha sem acesso'; end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function private.protect_campaign_system() from public;
create trigger protect_campaign_system before update on public.campaigns for each row execute function private.protect_campaign_system();
create trigger protect_sheet_system before insert or update on public.character_sheets for each row execute function private.protect_campaign_system();
create function private.accept_campaign_code(code text) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare target uuid; begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'Entre em uma conta ativa'; end if;
 if char_length(trim(code)) not between 8 and 64 then raise exception 'Convite inválido'; end if;
 select id into target from public.campaigns where invite_code=upper(trim(code)) and deleted_at is null and archived_at is null and status='active';
 if target is null then raise exception 'Convite inválido ou campanha indisponível'; end if;
 insert into public.campaign_members(campaign_id,user_id,role) values(target,auth.uid(),'player') on conflict do nothing;
 return target;
end $$;
revoke all on function private.accept_campaign_code(text) from public;
grant execute on function private.accept_campaign_code(text) to authenticated;
create function public.join_campaign(code text) returns uuid language sql security invoker set search_path=pg_catalog,public as $$ select private.accept_campaign_code(code); $$;
revoke all on function public.join_campaign(text) from public, anon;
grant execute on function public.join_campaign(text) to authenticated;
-- Keep the legacy modifier unchanged; Organization has floor(attribute / 2), including zero.
create or replace function private.calculate_base_attribute_modifier() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if new.category='base_attribute' then
  new.temporary_bonus := case when exists(select 1 from public.character_sheets where id=new.character_id and system_key='organization') then floor(new.base_value/2) when new.base_value<=0 then -1 else floor(new.base_value/2) end;
 end if;
 return new;
end $$;
create or replace view public.character_summary with(security_invoker=true) as
select s.id,s.owner_id,s.campaign_id,s.name,s.true_name,s.portrait_url,s.status,s.rank_name,s.class_name,s.soul_cores,s.archived_at,s.updated_at,coalesce(h.current_value,0) current_hp,coalesce(h.max_value,0) max_hp,coalesce(e.current_value,0) current_essence,coalesce(e.max_value,0) max_essence,s.is_npc,s.system_key
from public.character_sheets s left join public.character_stats h on h.character_id=s.id and h.stat_key='hp' left join public.character_stats e on e.character_id=s.id and e.stat_key='essence' where s.deleted_at is null;
-- Atomic Organization save: RLS applies to both sheet and resource writes.
create function public.save_organization_character(target_id uuid,target_campaign uuid,character_name text,character_age integer,npc boolean,payload jsonb) returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare result uuid; attrs jsonb; hpmax numeric; manamax numeric; n text; v numeric; begin
 if auth.uid() is null or not private.is_campaign_member(target_campaign) then raise exception 'Campanha sem acesso'; end if;
 if not exists(select 1 from public.campaigns where id=target_campaign and system_key='organization') then raise exception 'Sistema inválido'; end if;
 if jsonb_typeof(payload)<>'object' or jsonb_typeof(payload->'attributes') is distinct from 'array' then raise exception 'Ficha inválida'; end if;
 attrs:=payload->'attributes';
 if jsonb_array_length(attrs)<>6 then raise exception 'São necessários seis atributos'; end if;
 for n in select jsonb_array_elements_text(attrs) loop
  v:=n::numeric;
  if v<0 or v<>floor(v) or v>100000 then raise exception 'Atributos inválidos'; end if;
 end loop;
 foreach n in array array['hp','hpBase','mana','manaBase','movementBase','armor','armorBonus','mr','mrBonus','backpackSlots','percentage','money'] loop
  if not payload ? n or jsonb_typeof(payload->n)<>'number' then raise exception 'Campo numérico inválido: %',n; end if;
  v:=(payload->>n)::numeric;
  if v<0 or v>1000000000 then raise exception 'Valor fora dos limites: %',n; end if;
 end loop;
 if (payload->>'percentage')::numeric not between 50 and 100 then raise exception 'Porcentagem inválida'; end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_typeof(payload->'abilities') is distinct from 'array' then raise exception 'Coleções inválidas'; end if;
 hpmax:=(payload->>'hpBase')::numeric+floor((attrs->>2)::numeric/10)*10;
 manamax:=(payload->>'manaBase')::numeric+floor((attrs->>3)::numeric/10)*5;
 if (payload->>'hp')::numeric>hpmax or (payload->>'mana')::numeric>manamax then raise exception 'Recurso atual acima do máximo'; end if;
 if target_id is null then
  insert into public.character_sheets(owner_id,campaign_id,name,age,is_npc,system_key,organization_data,class_name) values(auth.uid(),target_campaign,character_name,character_age,npc,'organization',payload,payload->>'className') returning id into result;
 else
  update public.character_sheets set name=character_name,age=character_age,organization_data=payload,class_name=payload->>'className' where id=target_id and campaign_id=target_campaign and system_key='organization' and is_npc=npc returning id into result;
  if result is null then raise exception 'Ficha sem permissão'; end if;
 end if;
 insert into public.character_stats(character_id,stat_key,label,category,base_value,current_value,max_value) values
 (result,'hp','HP','resource',0,(payload->>'hp')::numeric,hpmax),(result,'essence','Mana','resource',0,(payload->>'mana')::numeric,manamax)
 on conflict(character_id,stat_key) do update set current_value=excluded.current_value,max_value=excluded.max_value;
 return result;
end $$;
revoke all on function public.save_organization_character(uuid,uuid,text,integer,boolean,jsonb) from public,anon;
grant execute on function public.save_organization_character(uuid,uuid,text,integer,boolean,jsonb) to authenticated;

drop policy sheets_read on public.character_sheets;
create policy sheets_read on public.character_sheets for select to authenticated using(deleted_at is null and (private.is_admin() or private.is_campaign_master(campaign_id) or (not is_npc and owner_id=(select auth.uid()) and (campaign_id is null or private.is_campaign_member(campaign_id)))));

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
    is_npc, system_key, organization_data
  ) values (
    (select auth.uid()), src.campaign_id, src.template_id, src.name || ' (cópia)',
    src.portrait_url, src.true_name, src.true_name_meaning, src.true_name_effect,
    src.age, src.gender, src.pronouns, src.origin, src.birthplace,
    src.affiliation, src.occupation, src.physical_description, src.personality,
    src.backstory, src.objectives, src.private_notes, src.status, src.rank_name,
    src.class_name, src.soul_cores, src.max_soul_cores, src.soul_fragments,
    src.next_core_fragments, src.aspect_rank, src.soul_rank, src.lineage,
    src.aspect_legacy, src.corruption, src.visibility, src.is_npc, src.system_key, src.organization_data
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
