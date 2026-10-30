-- Class metadata stays in organization_data; preserve RLS and existing characters.
-- Extend Organization saves without rewriting existing sheets or changing access policies.
create or replace function public.save_organization_character(target_id uuid,target_campaign uuid,character_name text,character_age integer,npc boolean,payload jsonb) returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
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
  if v < (case when n in ('armor','armorBonus','mr','mrBonus') then -1000000000 else 0 end) or v>1000000000 then raise exception 'Valor fora dos limites: %',n; end if;
 end loop;
 if (payload->>'percentage')::numeric not between 50 and 100 then raise exception 'Porcentagem inválida'; end if;
 if payload ? 'accustomedPercentage' and (jsonb_typeof(payload->'accustomedPercentage') is distinct from 'number' or (payload->>'accustomedPercentage')::numeric not in (50,60,70,80,90,100)) then raise exception 'Porcentagem acostumada inválida'; end if;
 if payload ? 'subclass' and jsonb_typeof(payload->'subclass') is distinct from 'string' then raise exception 'Subclasse inválida'; end if;
 if payload ? 'classNotes' and jsonb_typeof(payload->'classNotes') is distinct from 'string' then raise exception 'Definições da classe inválidas'; end if;
 if payload ? 'tempHp' and (jsonb_typeof(payload->'tempHp')<>'number' or (payload->>'tempHp')::numeric<0 or (payload->>'tempHp')::numeric>1000000000) then raise exception 'HP temporário inválido'; end if;
 if payload ? 'portraitUrl' and jsonb_typeof(payload->'portraitUrl')<>'string' then raise exception 'Retrato inválido'; end if;
 if payload ? 'customAttributes' then
  if jsonb_typeof(payload->'customAttributes')<>'array' then raise exception 'Atributos extras inválidos'; end if;
  if exists(select 1 from jsonb_array_elements(payload->'customAttributes') a where jsonb_typeof(a)<>'object' or jsonb_typeof(a->'label') is distinct from 'string' or jsonb_typeof(a->'base') is distinct from 'number') then raise exception 'Atributo extra inválido'; end if;
 end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_typeof(payload->'abilities') is distinct from 'array' then raise exception 'Coleções inválidas'; end if;
 hpmax:=(payload->>'hpBase')::numeric+floor((attrs->>2)::numeric/10)*10;
 manamax:=(payload->>'manaBase')::numeric+floor((attrs->>3)::numeric/10)*5;
 if (payload->>'hp')::numeric>hpmax or (payload->>'mana')::numeric>manamax then raise exception 'Recurso atual acima do máximo'; end if;
 if target_id is null then
  insert into public.character_sheets(owner_id,campaign_id,name,age,is_npc,system_key,organization_data,class_name,portrait_url) values(auth.uid(),target_campaign,character_name,character_age,npc,'organization',payload,payload->>'className',nullif(payload->>'portraitUrl','')) returning id into result;
 else
  update public.character_sheets set name=character_name,age=character_age,organization_data=payload,class_name=payload->>'className',portrait_url=case when payload ? 'portraitUrl' then nullif(payload->>'portraitUrl','') else portrait_url end where id=target_id and campaign_id=target_campaign and system_key='organization' and is_npc=npc returning id into result;
  if result is null then raise exception 'Ficha sem permissão'; end if;
 end if;
 insert into public.character_stats(character_id,stat_key,label,category,base_value,current_value,max_value,temporary_bonus) values
 (result,'hp','HP','resource',0,(payload->>'hp')::numeric,hpmax,coalesce((payload->>'tempHp')::numeric,0)),(result,'essence','Mana','resource',0,(payload->>'mana')::numeric,manamax,0)
 on conflict(character_id,stat_key) do update set current_value=excluded.current_value,max_value=excluded.max_value,temporary_bonus=excluded.temporary_bonus;
 return result;
end $$;

-- Patch combat fields atomically; preserve the rest of the sheet and enforce existing RLS.
create or replace function public.update_organization_combat(target_id uuid, changes jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare s public.character_sheets; payload jsonb; item record; hpmax numeric; manamax numeric; currenthp numeric; currentmana numeric; temphp numeric;
begin
 if auth.uid() is null or not private.can_edit_character(target_id) then raise exception 'Sem permissão para alterar esta ficha'; end if;
 if jsonb_typeof(changes) is distinct from 'object' or changes='{}'::jsonb then raise exception 'Ajuste de combate inválido'; end if;
 for item in select key,value from jsonb_each(changes) loop
  if item.key not in ('hp','tempHp','hpBase','mana','manaBase','armor','armorBonus','mr','mrBonus','movementBase') then raise exception 'Campo de combate inválido: %',item.key; end if;
  if jsonb_typeof(item.value) is distinct from 'number' then raise exception 'Valor numérico inválido'; end if;
  if item.value::text::numeric < (case when item.key in ('armor','armorBonus','mr','mrBonus') then -1000000000 else 0 end) or item.value::text::numeric>1000000000 then raise exception 'Valor fora dos limites'; end if;
 end loop;
 select * into s from public.character_sheets where id=target_id and system_key='organization' and deleted_at is null for update;
 if not found then raise exception 'Ficha da Organização não encontrada'; end if;
 select current_value,temporary_bonus into currenthp,temphp from public.character_stats where character_id=target_id and stat_key='hp';
 select current_value into currentmana from public.character_stats where character_id=target_id and stat_key='essence';
 payload:=s.organization_data || jsonb_build_object('hp',coalesce(currenthp,(s.organization_data->>'hp')::numeric,10),'mana',coalesce(currentmana,(s.organization_data->>'mana')::numeric,10),'tempHp',coalesce(temphp,(s.organization_data->>'tempHp')::numeric,0)) || changes;
 hpmax:=(payload->>'hpBase')::numeric+floor((payload->'attributes'->>2)::numeric/10)*10;
 manamax:=(payload->>'manaBase')::numeric+floor((payload->'attributes'->>3)::numeric/10)*5;
 currenthp:=least(hpmax,(payload->>'hp')::numeric);
 currentmana:=least(manamax,(payload->>'mana')::numeric);
 payload:=payload || jsonb_build_object('hp',currenthp,'mana',currentmana);
 update public.character_sheets set organization_data=payload where id=target_id;
 insert into public.character_stats(character_id,stat_key,label,category,base_value,current_value,max_value,temporary_bonus) values
 (target_id,'hp','HP','resource',0,currenthp,hpmax,(payload->>'tempHp')::numeric),
 (target_id,'essence','Mana','resource',0,currentmana,manamax,0)
 on conflict(character_id,stat_key) do update set current_value=excluded.current_value,max_value=excluded.max_value,temporary_bonus=excluded.temporary_bonus;
 return payload;
end $$;
revoke all on function public.update_organization_combat(uuid,jsonb) from public,anon;
grant execute on function public.update_organization_combat(uuid,jsonb) to authenticated;
