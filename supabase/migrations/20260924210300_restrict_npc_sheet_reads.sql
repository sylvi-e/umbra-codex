drop policy if exists sheets_read on public.character_sheets;

create policy sheets_read
on public.character_sheets
for select
to authenticated
using (private.can_view_character(id));
