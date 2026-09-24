-- Campaign deletion is intentionally restricted to administrators.
-- Character sheets survive because character_sheets.campaign_id uses ON DELETE SET NULL.
drop policy if exists campaigns_delete_admin on public.campaigns;

create policy campaigns_delete_admin
on public.campaigns
for delete
to authenticated
using (private.is_admin());
