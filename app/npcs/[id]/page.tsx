import { AdminOnly } from "@/components/umbra/admin-only";
import { AppShell } from "@/components/umbra/app-shell";
import { CharacterView } from "@/components/umbra/character-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <AdminOnly>
        <CharacterView characterId={id} kind="npc" />
      </AdminOnly>
    </AppShell>
  );
}
