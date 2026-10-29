import { AppShell } from "@/components/umbra/app-shell";
import { SheetView as CharacterView } from "@/components/umbra/sheet-dispatcher";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <CharacterView characterId={id} />
    </AppShell>
  );
}
