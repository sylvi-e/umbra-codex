-- Isolated fixture test. Run on a test database, never against production.
-- Fixture users/campaign are seeded by the isolated test harness.
begin;
do $$ begin
 if not exists(select 1 from public.character_sheets where id='30000000-0000-0000-0000-000000000001' and campaign_id='20000000-0000-0000-0000-000000000001' and system_key='shadow_slave') then raise exception 'Legacy association not preserved'; end if;
 if not exists(select 1 from public.character_stats where character_id='30000000-0000-0000-0000-000000000001' and base_value=42) then raise exception 'Legacy content lost'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare c uuid; n uuid; p uuid; payload jsonb := '{"attributes":[13,10,10,10,0,0],"hp":20,"hpBase":10,"mana":15,"manaBase":10,"movementBase":9,"armor":1,"armorBonus":1,"mr":0,"mrBonus":0,"money":713,"percentage":50,"backpackSlots":0,"items":[],"abilities":[]}'::jsonb; begin
 insert into public.campaigns(owner_id,name,system_key) values(auth.uid(),'Organization test','organization') returning id into c;
 perform set_config('test.campaign',c::text,true);
 perform set_config('test.code',(select invite_code from public.campaigns where id=c),true);
 -- Campaign owners count as masters without relying on a global admin role.
 insert into public.campaign_members(campaign_id,user_id,role) values(c,auth.uid(),'master');
 n:=public.save_organization_character(null,c,'Hidden NPC',23,true,payload);
 perform set_config('test.npc',n::text,true);
 if not exists(select 1 from public.character_stats where character_id=n and stat_key='hp' and max_value=20) then raise exception 'HP upgrade failed'; end if;
 p:=public.save_organization_character(null,c,'Owner character',23,false,payload);
 perform set_config('test.owner_character',p::text,true);
 if public.duplicate_character(p) is null then raise exception 'Duplication failed'; end if;
 begin
  update public.campaigns set system_key='shadow_slave' where id=c;
  raise exception 'System switch allowed';
 exception when raise_exception then if sqlerrm='System switch allowed' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ declare c uuid:=current_setting('test.campaign')::uuid; payload jsonb := '{"attributes":[0,0,0,0,0,0],"hp":10,"hpBase":10,"mana":10,"manaBase":10,"movementBase":9,"armor":0,"armorBonus":0,"mr":0,"mrBonus":0,"money":0,"percentage":50,"backpackSlots":0,"items":[],"abilities":[]}'::jsonb; p uuid; begin
 if exists(select 1 from public.campaigns where id=c) then raise exception 'Outsider sees campaign'; end if;
 perform public.join_campaign(current_setting('test.code'));
 perform public.join_campaign(current_setting('test.code'));
 if not exists(select 1 from public.campaigns where id=c) then raise exception 'Invite failed'; end if;
 if exists(select 1 from public.character_sheets where id=current_setting('test.npc')::uuid) then raise exception 'Player sees NPC'; end if;
 if exists(select 1 from public.character_sheets where id=current_setting('test.owner_character')::uuid) then raise exception 'Player sees another player private sheet'; end if;
 p:=public.save_organization_character(null,c,'Player character',22,false,payload);
 if not exists(select 1 from public.character_sheets where id=p) then raise exception 'Player cannot read own insert'; end if;
 begin
  perform public.save_organization_character(null,c,'Forbidden NPC',22,true,payload);
  raise exception 'Player created NPC';
 exception when insufficient_privilege then null; end;
 begin
  update public.character_sheets set is_npc=true where id=p;
  raise exception 'Player promoted own sheet to NPC';
 exception when raise_exception then if sqlerrm='Player promoted own sheet to NPC' then raise; end if; end;
 if exists(select 1 from public.character_stats where character_id=current_setting('test.npc')::uuid) then raise exception 'Child table leak'; end if;
end $$;
rollback;
