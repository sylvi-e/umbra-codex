create or replace function private.calculate_base_attribute_modifier()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.category = 'base_attribute' then
    new.temporary_bonus := case
      when new.base_value <= 0 then -1
      else floor(new.base_value / 2)
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists calculate_base_attribute_modifier on public.character_stats;

create trigger calculate_base_attribute_modifier
before insert or update
on public.character_stats
for each row
execute function private.calculate_base_attribute_modifier();

update public.character_stats
set temporary_bonus = case
  when base_value <= 0 then -1
  else floor(base_value / 2)
end
where category = 'base_attribute'
  and temporary_bonus is distinct from case
    when base_value <= 0 then -1
    else floor(base_value / 2)
  end;
