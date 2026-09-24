create extension if not exists pgcrypto;
create schema if not exists private;

create type public.app_role as enum ('admin','game_master','player');
create type public.account_status as enum ('active','suspended');
create type public.visibility_level as enum ('public','campaign','owner','owner_masters','admin');
create type public.member_role as enum ('master','assistant_master','player');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  avatar_url text,
  status public.account_status not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table private.admin_allowlist (email text primary key, created_at timestamptz not null default now());

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  cover_url text,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  status text not null default 'active' check (status in ('draft','active','paused','finished')),
  rules jsonb not null default '{}'::jsonb,
  formulas jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'player',
  joined_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);

create table public.sheet_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  version integer not null default 1,
  is_default boolean not null default false,
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.template_sections (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.sheet_templates(id) on delete cascade,
  section_key text not null, label text not null, sort_order integer not null default 0, active boolean not null default true,
  required boolean not null default false, settings jsonb not null default '{}'::jsonb,
  unique(template_id,section_key)
);

create table public.character_sheets (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  campaign_id uuid references public.campaigns(id) on delete set null, template_id uuid references public.sheet_templates(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120), portrait_url text, true_name text,
  true_name_meaning text, true_name_effect text, age integer check (age is null or age >= 0), gender text, pronouns text,
  origin text, birthplace text, affiliation text, occupation text, physical_description text, personality text, backstory text,
  objectives text, private_notes text, status text not null default 'active', rank_name text, class_name text,
  soul_cores integer not null default 1 check (soul_cores >= 0), max_soul_cores integer not null default 7 check (max_soul_cores > 0),
  soul_fragments numeric not null default 0 check (soul_fragments >= 0), next_core_fragments numeric not null default 1000 check (next_core_fragments > 0),
  aspect_rank text, soul_rank text, lineage text, aspect_legacy text, corruption numeric not null default 0 check (corruption >= 0),
  visibility jsonb not null default '{"default":"owner_masters","true_name":"owner","private_notes":"owner_masters"}'::jsonb,
  version integer not null default 1, archived_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index character_sheets_owner_idx on public.character_sheets(owner_id) where deleted_at is null;
create index character_sheets_campaign_idx on public.character_sheets(campaign_id) where campaign_id is not null and deleted_at is null;
create index character_sheets_updated_idx on public.character_sheets(updated_at desc);

create table public.character_stats (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  stat_key text not null, label text not null, category text not null default 'custom', base_value numeric not null default 0,
  temporary_bonus numeric not null default 0, penalty numeric not null default 0, current_value numeric, max_value numeric, notes text,
  formula text, sort_order integer not null default 0, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(character_id,stat_key)
);
create table public.character_traits (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null, icon_url text, rank_name text, category text, short_description text, description text, mechanical_effect text,
  origin text, activation_conditions text, visibility public.visibility_level not null default 'owner_masters', active boolean not null default true,
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.character_aspects (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  is_primary boolean not null default true, name text not null, rank_name text, description text, origin text, evolution_state text,
  potential text, image_url text, narrative_text text, mechanic text, conditions text, costs text, limitations text,
  visibility public.visibility_level not null default 'owner_masters', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(character_id,is_primary)
);
create table public.aspect_abilities (
  id uuid primary key default gen_random_uuid(), aspect_id uuid not null references public.character_aspects(id) on delete cascade,
  name text not null, unlock_stage text, rank_name text, ability_type text not null default 'active', description text, mechanical_effect text,
  essence_cost numeric, range_text text, area_text text, duration_text text, cooldown_text text, max_uses integer, activation_condition text,
  action_type text, required_test text, effect_formula text, notes text, unlocked boolean not null default false,
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.character_flaws (
  id uuid primary key default gen_random_uuid(), character_id uuid not null unique references public.character_sheets(id) on delete cascade,
  name text not null, narrative_description text, mechanical_effect text, trigger_text text, consequences text, special_conditions text,
  visibility public.visibility_level not null default 'owner_masters', master_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.character_skills (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null, category text, rank_name text, skill_type text, description text, effect text, cost_text text, range_text text,
  duration_text text, cooldown_text text, current_uses integer, max_uses integer, roll_formula text, associated_attribute text,
  conditions text, tags text[] not null default '{}', icon_url text, notes text, state text not null default 'active',
  visibility public.visibility_level not null default 'owner_masters', sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index character_skills_search_idx on public.character_skills using gin(to_tsvector('simple',coalesce(name,'')||' '||coalesce(description,'')));

create table public.character_memories (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null, image_url text, rank_name text, tier integer, memory_type text, category text, description text, mechanical_effects text,
  damage_text text, defense_text text, range_text text, essence_cost numeric, durability numeric, state text not null default 'stored',
  equipment_slot text, origin text, history text, requirements text, tags text[] not null default '{}', notes text,
  bonus_rules jsonb not null default '[]'::jsonb, bonuses_applied boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.memory_enchantments (
  id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.character_memories(id) on delete cascade,
  name text not null, description text, mechanical_effect text, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.character_echoes (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null, image_url text, rank_name text, class_name text, creature_type text, state text, description text, appearance text,
  personality text, origin text, loyalty text, summon_condition text, summon_cost text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.echo_stats (
  id uuid primary key default gen_random_uuid(), echo_id uuid not null references public.character_echoes(id) on delete cascade,
  stat_key text not null, label text not null, current_value numeric, max_value numeric, base_value numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb, unique(echo_id,stat_key)
);
create table public.echo_abilities (
  id uuid primary key default gen_random_uuid(), echo_id uuid not null references public.character_echoes(id) on delete cascade,
  name text not null, ability_type text, description text, mechanical_effect text, roll_formula text, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null, quantity numeric not null default 1 check (quantity >= 0), unit_weight numeric not null default 0 check (unit_weight >= 0),
  category text, description text, effect text, value_amount numeric, rarity text, state text, equipped boolean not null default false,
  storage_location text, image_url text, tags text[] not null default '{}', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index inventory_character_idx on public.inventory_items(character_id);

create table public.character_conditions (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null, description text, mechanical_effect text, duration_text text, expires_at timestamptz, source text,
  active boolean not null default true, applied_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.character_notes (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  author_id uuid not null references public.profiles(id), title text, content text not null, note_type text not null default 'player',
  visibility public.visibility_level not null default 'owner', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.character_history (
  id bigint generated always as identity primary key, character_id uuid not null references public.character_sheets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null, event_type text not null, field_key text, old_value jsonb, new_value jsonb,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index character_history_character_idx on public.character_history(character_id,created_at desc);
create table public.character_entries (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  entry_type text not null check (entry_type in ('attack','combat_technique','resistance','weakness','proficiency','language','ally','enemy','organization','journal','session','mission','achievement','evolution','gallery')),
  name text not null, description text, data jsonb not null default '{}'::jsonb, visibility public.visibility_level not null default 'owner_masters',
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.dice_rolls (
  id bigint generated always as identity primary key, character_id uuid references public.character_sheets(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade, roller_id uuid not null default auth.uid() references public.profiles(id),
  formula text not null check (formula ~ '^\s*[0-9]{1,2}d[0-9]{1,4}\s*([+-]\s*[0-9]+)?\s*$'), rolls integer[] not null,
  total integer not null, visibility public.visibility_level not null default 'owner', is_critical boolean not null default false,
  is_fumble boolean not null default false, created_at timestamptz not null default now()
);

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(), template_id uuid references public.sheet_templates(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade, field_key text not null, label text not null,
  field_type text not null check (field_type in ('text','number','select','multi_select','date','image','boolean','long_text')),
  section_key text not null, required boolean not null default false, active boolean not null default true,
  visibility public.visibility_level not null default 'owner_masters', options jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.custom_field_values (
  id uuid primary key default gen_random_uuid(), character_id uuid not null references public.character_sheets(id) on delete cascade,
  field_id uuid not null references public.custom_fields(id) on delete restrict, value jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(character_id,field_id)
);
create table public.system_settings (
  key text primary key, value jsonb not null, description text, updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.system_options (
  id uuid primary key default gen_random_uuid(), group_key text not null, label text not null, value text not null,
  sort_order integer not null default 0, active boolean not null default true, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(group_key,value)
);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id text, old_value jsonb, new_value jsonb,
  ip_hash text, created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
create table public.invitations (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns(id) on delete cascade,
  email text, invited_user_id uuid references public.profiles(id) on delete cascade, invited_by uuid not null references public.profiles(id),
  role public.member_role not null default 'player', token_hash text not null unique, status text not null default 'pending', expires_at timestamptz not null,
  created_at timestamptz not null default now(), accepted_at timestamptz
);

create or replace function private.is_admin() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin');
$$;
create or replace function private.is_campaign_master(target_campaign_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.campaigns c where c.id=target_campaign_id and c.owner_id=(select auth.uid()))
    or exists(select 1 from public.campaign_members m where m.campaign_id=target_campaign_id and m.user_id=(select auth.uid()) and m.role in ('master','assistant_master'));
$$;
create or replace function private.can_view_character(target_character_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.character_sheets s where s.id=target_character_id and s.deleted_at is null and (s.owner_id=(select auth.uid()) or private.is_admin() or (s.campaign_id is not null and private.is_campaign_master(s.campaign_id))));
$$;
create or replace function private.can_edit_character(target_character_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.character_sheets s where s.id=target_character_id and s.deleted_at is null and (s.owner_id=(select auth.uid()) or private.is_admin() or (s.campaign_id is not null and private.is_campaign_master(s.campaign_id))));
$$;
revoke all on schema private from public; grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_admin(),private.is_campaign_master(uuid),private.can_view_character(uuid),private.can_edit_character(uuid) to authenticated;

create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path=pg_catalog as $$ begin new.updated_at=now(); return new; end $$;
create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin insert into public.audit_logs(actor_id,action,entity_type,entity_id,old_value,new_value) values((select auth.uid()),tg_op, tg_table_name, coalesce(new.id,old.id)::text, case when tg_op<>'INSERT' then to_jsonb(old) end, case when tg_op<>'DELETE' then to_jsonb(new) end); return coalesce(new,old); end $$;
create or replace function private.protect_ownership() returns trigger language plpgsql set search_path=pg_catalog,public,private as $$
begin if new.owner_id is distinct from old.owner_id and not private.is_admin() then raise exception 'Somente administradores podem transferir propriedade'; end if; return new; end $$;
create or replace function private.validate_resource_limits() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare allow_over boolean;
begin
  if new.category='resource' and new.current_value is not null and new.current_value<0 then raise exception 'O valor atual não pode ser negativo'; end if;
  select coalesce((value#>>'{}')::boolean,false) into allow_over from public.system_settings where key='allow_over_max_resources';
  if not allow_over and new.category='resource' and new.max_value is not null and new.current_value>new.max_value then raise exception 'O valor atual não pode ultrapassar o máximo'; end if;
  return new;
end $$;
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare base_username text; final_username text; n integer:=0;
begin
  base_username:=lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1),'player'),'[^a-z0-9_]+','_','g'));
  if char_length(base_username)<3 then base_username:='player_'||substr(new.id::text,1,6); end if;
  final_username:=left(base_username,32);
  while exists(select 1 from public.profiles where username=final_username) loop n:=n+1; final_username:=left(base_username,25)||'_'||n::text; end loop;
  insert into public.profiles(id,display_name,username) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1),'Jogador'),80),final_username);
  insert into public.user_roles(user_id,role) values(new.id,case when exists(select 1 from private.admin_allowlist where lower(email)=lower(new.email)) then 'admin'::public.app_role else 'player'::public.app_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

do $$ declare t text; begin foreach t in array array['profiles','user_roles','campaigns','sheet_templates','character_sheets','character_stats','character_traits','character_aspects','aspect_abilities','character_flaws','character_skills','character_memories','memory_enchantments','character_echoes','echo_abilities','inventory_items','character_conditions','character_notes','character_entries','custom_fields','custom_field_values','system_settings','system_options'] loop execute format('create trigger %I_touch before update on public.%I for each row execute function private.touch_updated_at()',t,t); end loop; end $$;
create trigger audit_character after insert or update or delete on public.character_sheets for each row execute function private.audit_change();
create trigger audit_campaign after insert or update or delete on public.campaigns for each row execute function private.audit_change();
create trigger audit_role after insert or update or delete on public.user_roles for each row execute function private.audit_change();
create trigger protect_character_owner before update on public.character_sheets for each row execute function private.protect_ownership();
create trigger protect_campaign_owner before update on public.campaigns for each row execute function private.protect_ownership();
create trigger validate_character_resource before insert or update on public.character_stats for each row execute function private.validate_resource_limits();

create or replace function public.adjust_character_resource(target_character_id uuid,resource_key text,amount numeric) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare old_row public.character_stats; new_row public.character_stats; allow_over boolean;
begin if not private.can_edit_character(target_character_id) then raise exception 'Acesso negado'; end if; if resource_key not in ('hp','essence') then raise exception 'Recurso inválido'; end if;
  select * into old_row from public.character_stats where character_id=target_character_id and stat_key=resource_key for update;
  if not found then raise exception 'Recurso não encontrado'; end if;
  select coalesce((value#>>'{}')::boolean,false) into allow_over from public.system_settings where key='allow_over_max_resources';
  update public.character_stats set current_value=greatest(0,case when allow_over then coalesce(current_value,0)+amount else least(coalesce(max_value,current_value,0),coalesce(current_value,0)+amount) end) where id=old_row.id returning * into new_row;
  insert into public.character_history(character_id,actor_id,event_type,field_key,old_value,new_value) values(target_character_id,(select auth.uid()),case when amount<0 then 'resource_spent' else 'resource_recovered' end,resource_key,to_jsonb(old_row.current_value),to_jsonb(new_row.current_value));
end $$;
create or replace function public.duplicate_character(source_character_id uuid) returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare new_id uuid; src public.character_sheets;
begin if not private.can_view_character(source_character_id) then raise exception 'Acesso negado'; end if; select * into src from public.character_sheets where id=source_character_id;
  insert into public.character_sheets(owner_id,campaign_id,template_id,name,portrait_url,true_name,true_name_meaning,true_name_effect,age,gender,pronouns,origin,birthplace,affiliation,occupation,physical_description,personality,backstory,objectives,private_notes,status,rank_name,class_name,soul_cores,max_soul_cores,soul_fragments,next_core_fragments,aspect_rank,soul_rank,lineage,aspect_legacy,corruption,visibility)
  values((select auth.uid()),null,src.template_id,src.name||' (cópia)',src.portrait_url,src.true_name,src.true_name_meaning,src.true_name_effect,src.age,src.gender,src.pronouns,src.origin,src.birthplace,src.affiliation,src.occupation,src.physical_description,src.personality,src.backstory,src.objectives,src.private_notes,src.status,src.rank_name,src.class_name,src.soul_cores,src.max_soul_cores,src.soul_fragments,src.next_core_fragments,src.aspect_rank,src.soul_rank,src.lineage,src.aspect_legacy,src.corruption,src.visibility) returning id into new_id;
  insert into public.character_stats(character_id,stat_key,label,category,base_value,temporary_bonus,penalty,current_value,max_value,notes,formula,sort_order,metadata) select new_id,stat_key,label,category,base_value,temporary_bonus,penalty,current_value,max_value,notes,formula,sort_order,metadata from public.character_stats where character_id=source_character_id;
  insert into public.character_traits(character_id,name,icon_url,rank_name,category,short_description,description,mechanical_effect,origin,activation_conditions,visibility,active,sort_order) select new_id,name,icon_url,rank_name,category,short_description,description,mechanical_effect,origin,activation_conditions,visibility,active,sort_order from public.character_traits where character_id=source_character_id;
  return new_id;
end $$;
create or replace function public.admin_set_user_status(target_user_id uuid,new_status public.account_status) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$ begin if not private.is_admin() then raise exception 'Acesso negado'; end if; update public.profiles set status=new_status where id=target_user_id; end $$;
create or replace function public.admin_transfer_character(target_character_id uuid,new_owner_id uuid) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$ begin if not private.is_admin() then raise exception 'Acesso negado'; end if; if not exists(select 1 from public.profiles where id=new_owner_id and status='active') then raise exception 'Novo proprietário inválido'; end if; update public.character_sheets set owner_id=new_owner_id where id=target_character_id; end $$;
create or replace function public.export_character(target_character_id uuid,include_secrets boolean default false) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  select jsonb_build_object('schema_version',1,'character',to_jsonb(s)-case when include_secrets then '' else 'private_notes' end,'stats',coalesce((select jsonb_agg(to_jsonb(x)) from public.character_stats x where x.character_id=s.id),'[]'::jsonb),'traits',coalesce((select jsonb_agg(to_jsonb(x)) from public.character_traits x where x.character_id=s.id),'[]'::jsonb),'skills',coalesce((select jsonb_agg(to_jsonb(x)) from public.character_skills x where x.character_id=s.id),'[]'::jsonb),'memories',coalesce((select jsonb_agg(to_jsonb(x)) from public.character_memories x where x.character_id=s.id),'[]'::jsonb),'echoes',coalesce((select jsonb_agg(to_jsonb(x)) from public.character_echoes x where x.character_id=s.id),'[]'::jsonb),'inventory',coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_items x where x.character_id=s.id),'[]'::jsonb)) from public.character_sheets s where s.id=target_character_id and private.can_view_character(s.id);
$$;
grant execute on function public.adjust_character_resource(uuid,text,numeric),public.duplicate_character(uuid),public.admin_set_user_status(uuid,public.account_status),public.admin_transfer_character(uuid,uuid),public.export_character(uuid,boolean) to authenticated;

create view public.profiles_with_role with (security_invoker=true) as select p.*,r.role from public.profiles p join public.user_roles r on r.user_id=p.id;
create view public.character_summary with (security_invoker=true) as select s.id,s.owner_id,s.campaign_id,s.name,s.true_name,s.portrait_url,s.status,s.rank_name,s.class_name,s.soul_cores,s.archived_at,s.updated_at,coalesce(h.current_value,0) current_hp,coalesce(h.max_value,0) max_hp,coalesce(e.current_value,0) current_essence,coalesce(e.max_value,0) max_essence from public.character_sheets s left join public.character_stats h on h.character_id=s.id and h.stat_key='hp' left join public.character_stats e on e.character_id=s.id and e.stat_key='essence' where s.deleted_at is null;

do $$ declare t text; begin foreach t in array array['profiles','user_roles','campaigns','campaign_members','sheet_templates','template_sections','character_sheets','character_stats','character_traits','character_aspects','aspect_abilities','character_flaws','character_skills','character_memories','memory_enchantments','character_echoes','echo_stats','echo_abilities','inventory_items','character_conditions','character_notes','character_history','character_entries','dice_rolls','custom_fields','custom_field_values','system_settings','system_options','audit_logs','invitations'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or private.is_admin() or exists(select 1 from public.campaign_members me join public.campaign_members other on other.campaign_id=me.campaign_id where me.user_id=(select auth.uid()) and other.user_id=profiles.id));
create policy profiles_update_self on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy roles_read on public.user_roles for select to authenticated using (user_id=(select auth.uid()) or private.is_admin());
create policy campaigns_read on public.campaigns for select to authenticated using (owner_id=(select auth.uid()) or private.is_admin() or exists(select 1 from public.campaign_members m where m.campaign_id=id and m.user_id=(select auth.uid())));
create policy campaigns_insert on public.campaigns for insert to authenticated with check (owner_id=(select auth.uid()));
create policy campaigns_update on public.campaigns for update to authenticated using (private.is_admin() or private.is_campaign_master(id)) with check (private.is_admin() or private.is_campaign_master(id));
create policy campaign_members_read on public.campaign_members for select to authenticated using (user_id=(select auth.uid()) or private.is_admin() or private.is_campaign_master(campaign_id));
create policy campaign_members_write on public.campaign_members for all to authenticated using (private.is_admin() or private.is_campaign_master(campaign_id)) with check (private.is_admin() or private.is_campaign_master(campaign_id));
create policy sheets_read on public.character_sheets for select to authenticated using (private.can_view_character(id));
create policy sheets_insert on public.character_sheets for insert to authenticated with check (owner_id=(select auth.uid()) or private.is_admin());
create policy sheets_update on public.character_sheets for update to authenticated using (private.can_edit_character(id)) with check (private.can_edit_character(id));
create policy sheets_delete on public.character_sheets for delete to authenticated using (private.is_admin());

do $$ declare t text; begin foreach t in array array['character_stats','character_traits','character_aspects','character_flaws','character_skills','character_memories','character_echoes','inventory_items','character_conditions','character_notes','character_history','character_entries','custom_field_values'] loop execute format('create policy %I_read on public.%I for select to authenticated using (private.can_view_character(character_id))',t,t); execute format('create policy %I_write on public.%I for all to authenticated using (private.can_edit_character(character_id)) with check (private.can_edit_character(character_id))',t,t); end loop; end $$;
create policy aspect_abilities_read on public.aspect_abilities for select to authenticated using (exists(select 1 from public.character_aspects a where a.id=aspect_id and private.can_view_character(a.character_id)));
create policy aspect_abilities_write on public.aspect_abilities for all to authenticated using (exists(select 1 from public.character_aspects a where a.id=aspect_id and private.can_edit_character(a.character_id))) with check (exists(select 1 from public.character_aspects a where a.id=aspect_id and private.can_edit_character(a.character_id)));
create policy memory_enchantments_read on public.memory_enchantments for select to authenticated using (exists(select 1 from public.character_memories m where m.id=memory_id and private.can_view_character(m.character_id)));
create policy memory_enchantments_write on public.memory_enchantments for all to authenticated using (exists(select 1 from public.character_memories m where m.id=memory_id and private.can_edit_character(m.character_id))) with check (exists(select 1 from public.character_memories m where m.id=memory_id and private.can_edit_character(m.character_id)));
create policy echo_stats_read on public.echo_stats for select to authenticated using (exists(select 1 from public.character_echoes e where e.id=echo_id and private.can_view_character(e.character_id)));
create policy echo_stats_write on public.echo_stats for all to authenticated using (exists(select 1 from public.character_echoes e where e.id=echo_id and private.can_edit_character(e.character_id))) with check (exists(select 1 from public.character_echoes e where e.id=echo_id and private.can_edit_character(e.character_id)));
create policy echo_abilities_read on public.echo_abilities for select to authenticated using (exists(select 1 from public.character_echoes e where e.id=echo_id and private.can_view_character(e.character_id)));
create policy echo_abilities_write on public.echo_abilities for all to authenticated using (exists(select 1 from public.character_echoes e where e.id=echo_id and private.can_edit_character(e.character_id))) with check (exists(select 1 from public.character_echoes e where e.id=echo_id and private.can_edit_character(e.character_id)));
create policy dice_read on public.dice_rolls for select to authenticated using (roller_id=(select auth.uid()) or private.is_admin() or (character_id is not null and private.can_view_character(character_id)) or (campaign_id is not null and private.is_campaign_master(campaign_id)));
create policy dice_insert on public.dice_rolls for insert to authenticated with check (roller_id=(select auth.uid()));
create policy templates_read on public.sheet_templates for select to authenticated using (active or private.is_admin()); create policy templates_admin on public.sheet_templates for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy template_sections_read on public.template_sections for select to authenticated using (exists(select 1 from public.sheet_templates t where t.id=template_id and (t.active or private.is_admin()))); create policy template_sections_admin on public.template_sections for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy custom_fields_read on public.custom_fields for select to authenticated using (active or private.is_admin()); create policy custom_fields_admin on public.custom_fields for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy settings_read on public.system_settings for select to authenticated using (true); create policy settings_admin on public.system_settings for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy options_read on public.system_options for select to authenticated using (active or private.is_admin()); create policy options_admin on public.system_options for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy audit_admin on public.audit_logs for select to authenticated using (private.is_admin());
create policy invitations_read on public.invitations for select to authenticated using (invited_user_id=(select auth.uid()) or invited_by=(select auth.uid()) or private.is_admin() or (campaign_id is not null and private.is_campaign_master(campaign_id)));
create policy invitations_write on public.invitations for all to authenticated using (private.is_admin() or (campaign_id is not null and private.is_campaign_master(campaign_id))) with check (private.is_admin() or (campaign_id is not null and private.is_campaign_master(campaign_id)));

grant usage on schema public to anon,authenticated; grant select,insert,update,delete on all tables in schema public to authenticated; grant usage,select on all sequences in schema public to authenticated; grant select on public.profiles_with_role,public.character_summary to authenticated;

insert into public.system_settings(key,value,description) values
('site_name','"Umbra Codex"','Nome público do site'),('primary_color','"#8b5cf6"','Cor principal'),('allow_player_sheet_creation','true','Jogadores podem criar fichas'),('allow_player_delete','false','Jogadores podem excluir permanentemente'),('allow_over_max_resources','false','Permite HP ou Essência acima do máximo'),('animations_enabled','true','Ativa animações discretas');
insert into public.system_options(group_key,label,value,sort_order) values
('rank','Dormente','dormant',0),('rank','Desperto','awakened',1),('rank','Ascendente','ascended',2),('rank','Transcendente','transcendent',3),('rank','Supremo','supreme',4),('rank','Sagrado','sacred',5),('rank','Divino','divine',6),
('class','Besta','beast',0),('class','Monstro','monster',1),('class','Demônio','demon',2),('class','Diabo','devil',3),('class','Tirano','tyrant',4),('class','Terror','terror',5),('class','Titã','titan',6),
('memory_type','Arma','weapon',0),('memory_type','Armadura','armor',1),('memory_type','Ferramenta','tool',2),('memory_type','Amuleto','amulet',3),('memory_type','Charme','charm',4),('memory_type','Vestimenta','clothing',5),('memory_type','Consumível','consumable',6),('memory_type','Transporte','transport',7),('memory_type','Armazenamento','storage',8),('memory_type','Outro','other',9);
with template as (insert into public.sheet_templates(name,description,is_default,settings) values('Shadow Slave','Modelo completo e configurável para fantasia sombria.',true,'{"preserve_disabled_fields":true}'::jsonb) returning id)
insert into public.template_sections(template_id,section_key,label,sort_order) select template.id,x.key,x.label,x.ord from template cross join (values('identity','Identidade',0),('combat','Status e Combate',1),('base_attributes','Atributos Base',2),('progression','Progressão do Desperto',3),('traits','Atributos',4),('aspect','Aspecto',5),('flaw','Defeito',6),('true_name','Nome Verdadeiro',7),('skills','Habilidades',8),('memories','Memórias',9),('echoes','Ecos',10),('inventory','Inventário',11),('additional','Seções Adicionais',12)) as x(key,label,ord);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('avatars','avatars',true,2097152,array['image/webp','image/jpeg','image/png']),('character-portraits','character-portraits',true,5242880,array['image/webp','image/jpeg','image/png']),('memory-images','memory-images',false,5242880,array['image/webp','image/jpeg','image/png']),('echo-images','echo-images',false,5242880,array['image/webp','image/jpeg','image/png']),('campaign-covers','campaign-covers',true,5242880,array['image/webp','image/jpeg','image/png']),('site-assets','site-assets',true,5242880,array['image/webp','image/jpeg','image/png','image/svg+xml']) on conflict(id) do nothing;
create policy storage_read_public on storage.objects for select to public using (bucket_id in ('avatars','character-portraits','campaign-covers','site-assets'));
create policy storage_read_owned on storage.objects for select to authenticated using (bucket_id in ('memory-images','echo-images') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy storage_insert_owned on storage.objects for insert to authenticated with check ((storage.foldername(name))[1]=(select auth.uid())::text and bucket_id in ('avatars','character-portraits','memory-images','echo-images','campaign-covers'));
create policy storage_update_owned on storage.objects for update to authenticated using (owner_id=(select auth.uid())::text) with check (owner_id=(select auth.uid())::text);
create policy storage_delete_owned on storage.objects for delete to authenticated using (owner_id=(select auth.uid())::text or private.is_admin());
