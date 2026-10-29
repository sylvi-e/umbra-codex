"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CharacterEditor } from "@/components/umbra/character-editor";
import { CharacterView } from "@/components/umbra/character-view";
import { OrganizationEditor } from "@/components/umbra/organization-editor";
type Props = {
  characterId?: string;
  campaignId?: string;
  kind?: "player" | "npc";
  readOnly?: boolean;
};
function Dispatcher({
  characterId,
  campaignId,
  kind = "player",
  readOnly = false,
}: Props) {
  const [system, setSystem] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const client = createClient();
      if (!client) return;
      const result = characterId
        ? await client
            .from("character_sheets")
            .select("system_key")
            .eq("id", characterId)
            .single()
        : await client
            .from("campaigns")
            .select("system_key")
            .eq("id", campaignId!)
            .single();
      if (cancelled) return;
      if (result.error)
        setError(
          "Campanha ou ficha não encontrada, ou sem permissão de acesso.",
        );
      else setSystem(result.data.system_key);
    }
    if (characterId || campaignId) void load();
    return () => {
      cancelled = true;
    };
  }, [characterId, campaignId]);
  if (!characterId && !campaignId)
    return (
      <div className="grim-card rounded-2xl p-8">
        <h1 className="font-serif text-2xl">Escolha uma campanha</h1>
        <p className="my-4">
          Abra uma campanha para criar sua ficha com o sistema correto.
        </p>
        <Link className="text-violet-300 underline" href="/campanhas">
          Ir para campanhas
        </Link>
      </div>
    );
  if (error) return <p role="alert">{error}</p>;
  if (!system) return <p>Carregando sistema…</p>;
  if (system === "organization")
    return (
      <OrganizationEditor
        characterId={characterId}
        campaignId={campaignId}
        kind={kind}
        readOnly={readOnly}
      />
    );
  return readOnly && characterId ? (
    <CharacterView characterId={characterId} kind={kind} />
  ) : (
    <CharacterEditor
      characterId={characterId}
      campaignId={campaignId}
      kind={kind}
    />
  );
}
export function SheetEditor(props: Props) {
  return <Dispatcher {...props} />;
}
export function SheetView(props: Props) {
  return <Dispatcher {...props} readOnly />;
}
