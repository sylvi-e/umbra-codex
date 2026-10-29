import { AppShell } from "@/components/umbra/app-shell";
import { SheetEditor as CharacterEditor } from "@/components/umbra/sheet-dispatcher";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ campanha?: string }>;
}) {
  const { campanha } = await searchParams;
  return (
    <AppShell>
      <CharacterEditor campaignId={campanha} kind="npc" />
    </AppShell>
  );
}
