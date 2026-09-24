alter table public.character_memories
  add column if not exists physical_description text;

alter table public.character_echoes
  add column if not exists enchantments text;
