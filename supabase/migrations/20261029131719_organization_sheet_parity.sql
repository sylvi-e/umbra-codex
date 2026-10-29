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
  if v<0 or v>1000000000 then raise exception 'Valor fora dos limites: %',n; end if;
 end loop;
 if (payload->>'percentage')::numeric not between 50 and 100 then raise exception 'Porcentagem inválida'; end if;
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
