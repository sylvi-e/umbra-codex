-- Patch combat fields atomically; preserve the rest of the sheet and enforce existing RLS.
create function public.update_organization_combat(target_id uuid, changes jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare s public.character_sheets; payload jsonb; item record; hpmax numeric; manamax numeric; currenthp numeric; currentmana numeric; temphp numeric;
begin
 if auth.uid() is null or not private.can_edit_character(target_id) then raise exception 'Sem permissão para alterar esta ficha'; end if;
 if jsonb_typeof(changes) is distinct from 'object' or changes='{}'::jsonb then raise exception 'Ajuste de combate inválido'; end if;
 for item in select key,value from jsonb_each(changes) loop
  if item.key not in ('hp','tempHp','hpBase','mana','manaBase','armor','armorBonus','mr','mrBonus','movementBase') then raise exception 'Campo de combate inválido: %',item.key; end if;
  if jsonb_typeof(item.value) is distinct from 'number' then raise exception 'Valor numérico inválido'; end if;
  if item.value::text::numeric<0 or item.value::text::numeric>1000000000 then raise exception 'Valor fora dos limites'; end if;
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
