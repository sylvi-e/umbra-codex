create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  base_username text;
  final_username text;
  base_display_name text;
  provider_avatar_url text;
  n integer := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1),
      'player'
    ),
    '[^a-z0-9_]+',
    '_',
    'g'
  ));

  if char_length(base_username) < 3 then
    base_username := 'player_' || substr(new.id::text, 1, 6);
  end if;

  final_username := left(base_username, 32);
  while exists(select 1 from public.profiles where username = final_username) loop
    n := n + 1;
    final_username := left(base_username, 25) || '_' || n::text;
  end loop;

  base_display_name := nullif(trim(coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Jogador'
  )), '');

  if char_length(coalesce(base_display_name, '')) < 2 then
    base_display_name := 'Jogador';
  end if;

  provider_avatar_url := nullif(trim(coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  )), '');

  insert into public.profiles(id, display_name, username, avatar_url)
  values(new.id, left(base_display_name, 80), final_username, provider_avatar_url);

  insert into public.user_roles(user_id, role)
  values(
    new.id,
    case
      when exists(
        select 1
        from private.admin_allowlist
        where lower(email) = lower(new.email)
      ) then 'admin'::public.app_role
      else 'player'::public.app_role
    end
  );

  return new;
end
$$;
