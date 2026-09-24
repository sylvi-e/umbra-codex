alter table public.character_notes
  add column is_pinned boolean not null default false;
