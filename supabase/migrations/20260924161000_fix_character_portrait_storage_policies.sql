drop policy if exists character_portraits_select on storage.objects;
drop policy if exists character_portraits_insert on storage.objects;
drop policy if exists character_portraits_update on storage.objects;
drop policy if exists character_portraits_delete on storage.objects;

create policy character_portraits_select on storage.objects
for select to authenticated
using (
  bucket_id = 'character-portraits'
  and private.can_view_character(((storage.foldername(storage.objects.name))[1])::uuid)
);

create policy character_portraits_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'character-portraits'
  and storage.objects.name like '%/portrait.webp'
  and private.can_edit_character(((storage.foldername(storage.objects.name))[1])::uuid)
);

create policy character_portraits_update on storage.objects
for update to authenticated
using (
  bucket_id = 'character-portraits'
  and private.can_edit_character(((storage.foldername(storage.objects.name))[1])::uuid)
)
with check (
  bucket_id = 'character-portraits'
  and storage.objects.name like '%/portrait.webp'
  and private.can_edit_character(((storage.foldername(storage.objects.name))[1])::uuid)
);

create policy character_portraits_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'character-portraits'
  and private.can_edit_character(((storage.foldername(storage.objects.name))[1])::uuid)
);
