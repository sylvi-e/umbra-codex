-- Execute em um banco de teste recém-migrado. A transação é revertida ao final.
begin;

do $$
declare
  player_a constant uuid := '00000000-0000-4000-8000-000000000001';
  player_b constant uuid := '00000000-0000-4000-8000-000000000002';
  sheet_b uuid;
  visible_count integer;
  changed_count integer;
begin
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    (player_a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.local','',now(),'{}','{"display_name":"Player A","username":"player_a"}',now(),now()),
    (player_b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.local','',now(),'{}','{"display_name":"Player B","username":"player_b"}',now(),now());
  insert into public.character_sheets(owner_id,name) values(player_b,'Ficha privada B') returning id into sheet_b;

  perform set_config('request.jwt.claim.sub',player_a::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  set local role authenticated;

  select count(*) into visible_count from public.character_sheets where id=sheet_b;
  if visible_count<>0 then raise exception 'Falha RLS: jogador A visualizou ficha do jogador B'; end if;

  update public.character_sheets set name='Ataque IDOR' where id=sheet_b;
  get diagnostics changed_count = row_count;
  if changed_count<>0 then raise exception 'Falha RLS: jogador A alterou ficha do jogador B'; end if;
end $$;

rollback;
