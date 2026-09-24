insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('character-portraits', 'character-portraits', false, 1048576, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy character_portraits_select on storage.objects
for select to authenticated
using (
  bucket_id = 'character-portraits'
  and exists (
    select 1 from public.character_sheets sheet
    where sheet.id::text = (storage.foldername(name))[1]
      and private.can_view_character(sheet.id)
  )
);

create policy character_portraits_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'character-portraits'
  and name like '%/portrait.webp'
  and exists (
    select 1 from public.character_sheets sheet
    where sheet.id::text = (storage.foldername(name))[1]
      and private.can_edit_character(sheet.id)
  )
);

create policy character_portraits_update on storage.objects
for update to authenticated
using (
  bucket_id = 'character-portraits'
  and exists (
    select 1 from public.character_sheets sheet
    where sheet.id::text = (storage.foldername(name))[1]
      and private.can_edit_character(sheet.id)
  )
)
with check (
  bucket_id = 'character-portraits'
  and name like '%/portrait.webp'
  and exists (
    select 1 from public.character_sheets sheet
    where sheet.id::text = (storage.foldername(name))[1]
      and private.can_edit_character(sheet.id)
  )
);

create policy character_portraits_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'character-portraits'
  and exists (
    select 1 from public.character_sheets sheet
    where sheet.id::text = (storage.foldername(name))[1]
      and private.can_edit_character(sheet.id)
  )
);
