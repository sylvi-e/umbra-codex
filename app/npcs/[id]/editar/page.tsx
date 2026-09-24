import { AdminOnly } from "@/components/umbra/admin-only";
import { AppShell } from "@/components/umbra/app-shell";
import { CharacterEditor } from "@/components/umbra/character-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <AdminOnly>
        <CharacterEditor characterId={id} kind="npc" />
      </AdminOnly>
    </AppShell>
  );
}
