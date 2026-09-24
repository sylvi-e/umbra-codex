-- INSERT ... RETURNING evaluates the SELECT policy in the same statement.
-- Check the new row directly so an administrator can receive its generated id.
drop policy if exists sheets_read on public.character_sheets;

create policy sheets_read
on public.character_sheets
for select
to authenticated
using (
  deleted_at is null
  and (
    (
      is_npc
      and private.is_admin()
    )
    or (
      not is_npc
      and (
        owner_id = (select auth.uid())
        or private.is_admin()
        or (
          campaign_id is not null
          and private.is_campaign_master(campaign_id)
        )
      )
    )
  )
);
