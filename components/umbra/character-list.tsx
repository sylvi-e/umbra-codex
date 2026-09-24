"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpenText,
  Copy,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeading } from "@/components/umbra/page-heading";
import { CharacterPortraitThumbnail } from "@/components/umbra/character-portrait";
import { createClient } from "@/lib/supabase/client";
import type { CharacterSummary } from "@/lib/types";
export function CharacterList({ kind = "player" }: { kind?: "player" | "npc" }) {
  const router = useRouter();
  const isNpc = kind === "npc";
  const basePath = isNpc ? "/npcs" : "/fichas";
  const [items, setItems] = useState<CharacterSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    const client = createClient();
    if (!client) return;
    const { data, error } = await client
      .from("character_summary")
      .select("*")
      .eq("is_npc", isNpc)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as CharacterSummary[]);
    setLoading(false);
  }
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, []);
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.true_name ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  async function archive(id: string) {
    const { error } = await createClient()!
      .from("character_sheets")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Ficha arquivada");
      void load();
    }
  }
  async function duplicate(id: string) {
    const { data, error } = await createClient()!.rpc("duplicate_character", {
      source_character_id: id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Ficha duplicada");
      router.push(`${basePath}/${String(data)}/editar`);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={isNpc ? "Controle do mestre" : "Arquivo de personagens"}
        title={isNpc ? "NPCs" : "Suas fichas"}
        description={isNpc ? "Crie e organize fichas de personagens não jogáveis." : "Pesquise, abra, duplique ou arquive registros."}
        action={
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link href={`${basePath}/nova`}>
              <Plus />
              {isNpc ? "Novo NPC" : "Nova ficha"}
            </Link>
          </Button>
        }
      />
      <div className="relative mb-5 max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          size={18}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por nome ou Nome Verdadeiro"
          className="h-11 border-white/10 bg-white/[.025] pl-10"
        />
      </div>
      {loading ? (
        <p className="text-zinc-500">Abrindo o arquivo…</p>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="grim-card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <Link href={`${basePath}/${item.id}`} className="min-w-0">
                  <p className="text-xs uppercase tracking-[.12em] text-violet-300/70">
                    {item.rank_name ?? "Sem rank"}
                  </p>
                  <h2 className="mt-2 truncate font-serif text-2xl">
                    {item.name}
                  </h2>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {item.true_name || "Nome Verdadeiro não registrado"}
                  </p>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ações de ${item.name}`}
                    >
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicate(item.id)}>
                      <Copy />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => archive(item.id)}>
                      <Archive />
                      Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CharacterPortraitThumbnail imageUrl={item.portrait_url} name={item.name} />
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                <Value label="HP" value={`${item.current_hp}/${item.max_hp}`} />
                <Value
                  label="Essência"
                  value={`${item.current_essence}/${item.max_essence}`}
                />
                <Value label="Núcleos" value={String(item.soul_cores)} />
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 border-white/10"
                >
                  <Link href={`${basePath}/${item.id}`}>Abrir</Link>
                </Button>
                <Button asChild className="flex-1 bg-violet-600/80">
                  <Link href={`${basePath}/${item.id}/editar`}>Editar</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grim-card rounded-2xl p-10 text-center">
          <BookOpenText className="mx-auto text-violet-300" />
          <h2 className="mt-4 font-serif text-2xl">{isNpc ? "Nenhum NPC encontrado" : "Nenhuma ficha encontrada"}</h2>
          <p className="mt-2 text-zinc-500">
            {isNpc ? "Crie um NPC ou ajuste sua pesquisa." : "Crie um personagem ou ajuste sua pesquisa."}
          </p>
        </div>
      )}
    </>
  );
}
function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[.035] p-3">
      <span className="block text-zinc-600">{label}</span>
      <strong className="mt-1 block text-zinc-200">{value}</strong>
    </div>
  );
}
