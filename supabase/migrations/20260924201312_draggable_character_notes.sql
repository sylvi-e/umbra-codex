alter table public.character_notes
  add column board_x integer not null default 24,
  add column board_y integer not null default 24,
  add column board_width integer not null default 320,
  add column board_height integer not null default 300,
  add column z_index integer not null default 1;

alter table public.character_notes
  add constraint character_notes_board_x_check check (board_x between 0 and 1000),
  add constraint character_notes_board_y_check check (board_y between 0 and 1000),
  add constraint character_notes_board_width_check check (board_width between 180 and 1000),
  add constraint character_notes_board_height_check check (board_height between 160 and 1000),
  add constraint character_notes_board_horizontal_bounds_check check (board_x + board_width <= 1000),
  add constraint character_notes_board_vertical_bounds_check check (board_y + board_height <= 1000),
  add constraint character_notes_z_index_check check (z_index > 0);

with positioned as (
  select id,
    row_number() over (partition by character_id order by created_at, id) - 1 as position
  from public.character_notes
  where note_type = 'player'
)
update public.character_notes as note
set
  board_x = 24 + ((positioned.position % 3) * 32)::integer,
  board_y = 24 + ((positioned.position % 5) * 32)::integer,
  z_index = positioned.position::integer + 1
from positioned
where note.id = positioned.id;

create index character_notes_board_idx
  on public.character_notes(character_id, note_type, z_index);
