import { AppShell } from "@/components/umbra/app-shell";
import { CampaignDetail } from "@/components/umbra/campaign-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <CampaignDetail campaignId={id} />
    </AppShell>
  );
}
