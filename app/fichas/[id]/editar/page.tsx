import { AppShell } from "@/components/umbra/app-shell";
import { SheetEditor as CharacterEditor } from "@/components/umbra/sheet-dispatcher";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <CharacterEditor characterId={id} />
    </AppShell>
  );
}
