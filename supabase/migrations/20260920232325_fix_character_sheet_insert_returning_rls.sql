-- INSERT ... RETURNING is checked against SELECT policies. Referencing the
-- just-created row through can_view_character() makes that check fail because
-- the row is not yet visible to the nested lookup. Evaluate the new row
-- directly while preserving the same owner/admin/campaign-master rules.
drop policy if exists sheets_read on public.character_sheets;

create policy sheets_read
on public.character_sheets
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_admin()
  or (
    campaign_id is not null
    and private.is_campaign_master(campaign_id)
  )
);
