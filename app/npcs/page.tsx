import { AdminOnly } from "@/components/umbra/admin-only";
import { AppShell } from "@/components/umbra/app-shell";
import { CharacterList } from "@/components/umbra/character-list";

export default function Page() {
  return (
    <AppShell>
      <AdminOnly>
        <CharacterList kind="npc" />
      </AdminOnly>
    </AppShell>
  );
}
