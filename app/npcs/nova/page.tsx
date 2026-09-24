import { AdminOnly } from "@/components/umbra/admin-only";
import { AppShell } from "@/components/umbra/app-shell";
import { CharacterEditor } from "@/components/umbra/character-editor";

export default function Page() {
  return (
    <AppShell>
      <AdminOnly>
        <CharacterEditor kind="npc" />
      </AdminOnly>
    </AppShell>
  );
}
