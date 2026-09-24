"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpenText,
  NotebookPen,
  Boxes,
  Download,
  Dumbbell,
  Ghost as Echo,
  Edit3,
  Heart,
  Minus,
  Package,
  Plus,
  Shield,
  Sparkles,
  Swords,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeading } from "@/components/umbra/page-heading";
import { CharacterPortraitCard } from "@/components/umbra/character-portrait";
import { ColoredText } from "@/components/umbra/colored-text";
import { CharacterNotesBoardView, type BoardNote } from "@/components/umbra/character-notes";
import { createClient } from "@/lib/supabase/client";
import { formatAttributeModifier } from "@/lib/character-rules";
type Row = Record<string, unknown>;
type ArsenalKind = "inventory" | "memories" | "echoes";
const arsenalLabels: Record<ArsenalKind, Record<string, string>> = {
  inventory: { name: "Nome", quantity: "Quantidade carregada", unit_weight: "Peso por unidade", category: "Categoria", rarity: "Raridade", state: "Estado", description: "Descrição", effect: "Efeito", value_amount: "Valor", storage_location: "Local de armazenamento", equipped: "Equipado", notes: "Observações" },
  memories: { name: "Nome", rank_name: "Rank", tier: "Tier", memory_type: "Tipo", category: "Categoria", enchantments: "Encantamentos", physical_description: "Descrição física", description: "Descrição", mechanical_effects: "Efeitos mecânicos", damage_text: "Dano", defense_text: "Defesa", range_text: "Alcance", essence_cost: "Custo de Essência", state: "Estado", history: "História", requirements: "Requisitos", notes: "Observações" },
  echoes: { name: "Nome", rank_name: "Rank", class_name: "Classe", creature_type: "Tipo de criatura", state: "Estado", enchantments: "Encantamentos", appearance: "Descrição física", description: "Descrição", personality: "Personalidade ou comportamento", origin: "Origem", loyalty: "Lealdade", summon_condition: "Condição para invocação", summon_cost: "Custo para invocar", notes: "Observações" },
};
const romanTiers = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;
type Stat = {
  stat_key: string;
  label: string;
  category: string;
  base_value: number;
  temporary_bonus: number;
  penalty: number;
  current_value: number | null;
  max_value: number | null;
  notes: string | null;
};
export function CharacterView({ characterId }: { characterId: string }) {
  const [data, setData] = useState<Row | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [aspect, setAspect] = useState<Row | null>(null);
  const [flaw, setFlaw] = useState<Row | null>(null);
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [collections, setCollections] = useState<{
    skills: Row[];
    memories: Row[];
    echoes: Row[];
    items: Row[];
  }>({ skills: [], memories: [], echoes: [], items: [] });
  const [arsenalDetail, setArsenalDetail] = useState<{ kind: ArsenalKind; row: Row } | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    const client = createClient();
    if (!client) return;
    const [s, st, a, f, sk, m, e, i, n] = await Promise.all([
      client
        .from("character_sheets")
        .select("*")
        .eq("id", characterId)
        .single(),
      client
        .from("character_stats")
        .select("*")
        .eq("character_id", characterId),
      client
        .from("character_aspects")
        .select("*")
        .eq("character_id", characterId)
        .eq("is_primary", true)
        .maybeSingle(),
      client
        .from("character_flaws")
        .select("*")
        .eq("character_id", characterId)
        .maybeSingle(),
      client
        .from("character_skills")
        .select("*")
        .eq("character_id", characterId),
      client
        .from("character_memories")
        .select("*")
        .eq("character_id", characterId),
      client
        .from("character_echoes")
        .select("*")
        .eq("character_id", characterId),
      client
        .from("inventory_items")
        .select("*")
        .eq("character_id", characterId),
      client
        .from("character_notes")
        .select("id,title,content,board_x,board_y,board_width,board_height,z_index,is_pinned")
        .eq("character_id", characterId)
        .eq("note_type", "player")
        .eq("is_pinned", true)
        .order("z_index"),
    ]);
    if (s.error) {
      toast.error("Você não tem acesso a esta ficha.");
      return;
    }
    setData(s.data as Row);
    setStats((st.data ?? []) as Stat[]);
    setAspect(a.data as Row | null);
    setFlaw(f.data as Row | null);
    setNotes((n.data ?? []) as BoardNote[]);
    setCollections({
      skills: (sk.data ?? []) as Row[],
      memories: (m.data ?? []) as Row[],
      echoes: (e.data ?? []) as Row[],
      items: (i.data ?? []) as Row[],
    });
    setLoading(false);
  }
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [characterId]);
  const byKey = useMemo(
    () => new Map(stats.map((s) => [s.stat_key, s])),
    [stats],
  );
  async function adjust(resource: "hp" | "essence", delta: number) {
    const { error } = await createClient()!.rpc("adjust_character_resource", {
      target_character_id: characterId,
      resource_key: resource,
      amount: delta,
    });
    if (error) toast.error(error.message);
    else void load();
  }
  async function openArsenalDetail(kind: ArsenalKind, row: Row) {
    if (kind !== "memories") {
      setArsenalDetail({ kind, row });
      return;
    }
    const { data: enchantments, error } = await createClient()!
      .from("memory_enchantments")
      .select("name")
      .eq("memory_id", String(row.id))
      .order("sort_order");
    if (error) {
      toast.error(error.message);
      return;
    }
    setArsenalDetail({
      kind,
      row: { ...row, enchantments: (enchantments ?? []).map((item: { name: string }) => item.name).join("\n") },
    });
  }
  async function exportJson() {
    const { data: json, error } = await createClient()!.rpc(
      "export_character",
      { target_character_id: characterId, include_secrets: true },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${String(data?.name ?? "ficha")
      .replace(/\s+/g, "-")
      .toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  if (loading) return <p className="text-zinc-500">Abrindo o registro…</p>;
  if (!data) return <p className="text-rose-300">Ficha indisponível.</p>;
  const hp = byKey.get("hp");
  return (
    <>
      <PageHeading
        eyebrow={`${String(data.rank_name ?? "Sem rank")} · ${String(data.class_name ?? "Sem classe")}`}
        title={String(data.name)}
        description={String(data.true_name ?? "Nome Verdadeiro desconhecido")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-white/10"
              onClick={exportJson}
            >
              <Download />
              Exportar
            </Button>
            <Button asChild className="bg-violet-600 hover:bg-violet-500">
              <Link href={`/fichas/${characterId}/editar`}>
                <Edit3 />
                Editar
              </Link>
            </Button>
          </div>
        }
      />
      <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <ResourceCard
          icon={Heart}
          label="Vitalidade"
          current={hp?.current_value ?? 0}
          max={hp?.max_value ?? 0}
          tone="rose"
          onDown={() => adjust("hp", -1)}
          onUp={() => adjust("hp", 1)}
        />
        <div className="grim-card grid grid-cols-3 rounded-2xl p-4">
          <Mini label="CA" value={byKey.get("armor_class")?.base_value ?? 0} />
          <Mini
            label="MR"
            value={byKey.get("magic_resistance")?.base_value ?? 0}
          />
          <Mini label="Núcleos" value={Number(data.soul_cores ?? 0)} />
        </div>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]">
        <Tabs defaultValue="overview">
          <TabsList className="h-auto w-full justify-start overflow-x-auto overflow-y-hidden bg-white/[.035] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="attributes">Atributos</TabsTrigger>
            <TabsTrigger value="powers">Poderes</TabsTrigger>
            <TabsTrigger value="arsenal">Arsenal</TabsTrigger>
            <TabsTrigger value="story">História</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Panel title="Identidade" icon={UserRound}>
              <InfoGrid
                entries={[
                  ["Afiliação", data.affiliation],
                  ["Estado", data.status],
                  ["Linhagem", data.lineage],
                  ["Rank da alma", data.soul_rank],
                ]}
              />
              <Text title="Personalidade" value={data.personality} />
            </Panel>
          </TabsContent>
          <TabsContent value="attributes">
            <Panel title="Atributos base" icon={Dumbbell}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats
                  .filter((s) => s.category === "base_attribute")
                  .map((s) => (
                    <div
                      key={s.stat_key}
                      className="rounded-xl bg-white/[.035] p-4"
                    >
                      <span className="text-sm text-zinc-500">{s.label}</span>
                      <strong className="mt-2 block text-3xl">
                        {formatAttributeModifier(s.temporary_bonus)}
                      </strong>
                      <span className="text-xs text-zinc-600">
                        Base {s.base_value} · Modificador {formatAttributeModifier(s.temporary_bonus)}
                      </span>
                    </div>
                  ))}
              </div>
            </Panel>
          </TabsContent>
          <TabsContent value="powers">
            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="Aspecto" icon={Sparkles}>
                <Text
                  title={String(aspect?.name ?? "Não registrado")}
                  value={aspect?.description}
                />
                <Text title="Efeito mecânico" value={aspect?.mechanic} />
              </Panel>
              <Panel title="Defeito" icon={Shield}>
                <Text
                  title={String(flaw?.name ?? "Não registrado")}
                  value={flaw?.narrative_description}
                />
                <Text title="Consequência" value={flaw?.mechanical_effect} />
              </Panel>
              <Panel title="Habilidades" icon={Swords}>
                {collections.skills.length ? (
                  <ul className="space-y-3">
                    {collections.skills.map((skill) => (
                      <li key={String(skill.id)} className="rounded-xl bg-white/[.03] p-3">
                        <strong className="text-sm"><ColoredText text={String(skill.name)} /></strong>
                        {skill.rank_name ? <span className="ml-2 text-xs text-violet-300">{String(skill.rank_name)}</span> : null}
                        {skill.description ? <ColoredText text={String(skill.description)} className="mt-2 block text-sm text-zinc-400" /> : null}
                        {skill.effect ? <p className="mt-2 text-sm text-zinc-500">Efeito: <ColoredText text={String(skill.effect)} /></p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty />
                )}
              </Panel>
            </div>
          </TabsContent>
          <TabsContent value="arsenal">
            <div className="grid gap-5 md:grid-cols-3">
              <Panel title="Memórias" icon={Archive}>
                {collections.memories.length ? (
                  <List rows={collections.memories} onOpen={(row) => void openArsenalDetail("memories", row)} />
                ) : (
                  <Empty />
                )}
              </Panel>
              <Panel title="Ecos" icon={Echo}>
                {collections.echoes.length ? (
                  <List rows={collections.echoes} onOpen={(row) => void openArsenalDetail("echoes", row)} />
                ) : (
                  <Empty />
                )}
              </Panel>
              <Panel title="Inventário" icon={Package}>
                {collections.items.length ? (
                  <List rows={collections.items} onOpen={(row) => void openArsenalDetail("inventory", row)} />
                ) : (
                  <Empty />
                )}
              </Panel>
            </div>
          </TabsContent>
          <TabsContent value="story">
            <Panel title="História" icon={BookOpenText}>
              <Text title="Passado" value={data.backstory} />
            </Panel>
          </TabsContent>
          <TabsContent value="notes">
            <Panel title="Notas" icon={NotebookPen}>
              <CharacterNotesBoardView notes={notes} />
            </Panel>
          </TabsContent>
        </Tabs>
        <aside className="space-y-5">
          <CharacterPortraitCard imageUrl={String(data.portrait_url ?? "")} name={`Retrato de ${String(data.name)}`} />
          <Panel title="Progressão" icon={Boxes}>
            <InfoGrid
              entries={[
                ["Rank", data.rank_name],
                ["Classe", data.class_name],
                ["Aspecto", data.aspect_rank],
                [
                  "Fragmentos",
                  `${String(data.soul_fragments ?? 0)} / ${String(data.next_core_fragments ?? 0)}`,
                ],
                ["Corrupção", data.corruption],
              ]}
            />
            <Progress
              className="mt-4 h-1.5"
              value={Math.min(
                100,
                (Number(data.soul_fragments ?? 0) /
                  Math.max(1, Number(data.next_core_fragments ?? 1))) *
                  100,
              )}
            />
          </Panel>
        </aside>
      </div>
      <Dialog open={arsenalDetail !== null} onOpenChange={(open) => { if (!open) setArsenalDetail(null); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#100e16] sm:max-w-2xl">
          {arsenalDetail ? <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">{String(arsenalDetail.row.name ?? "Sem nome")}</DialogTitle>
              <DialogDescription>Todos os detalhes registrados neste item do Arsenal.</DialogDescription>
            </DialogHeader>
            <dl className="grid gap-3 py-2 sm:grid-cols-2">
              {Object.entries(arsenalLabels[arsenalDetail.kind]).map(([key, label]) => {
                const value = arsenalDetail.row[key];
                if (value === null || value === undefined || value === "") return null;
                const displayed = key === "tier" ? romanTiers[Number(value) - 1] ?? String(value) : typeof value === "boolean" ? value ? "Sim" : "Não" : String(value);
                const wide = ["description", "physical_description", "appearance", "effect", "mechanical_effects", "enchantments", "history", "notes", "personality", "summon_condition"].includes(key);
                return <div key={key} className={`rounded-xl border border-white/[.07] bg-black/20 p-3 ${wide ? "sm:col-span-2" : ""}`}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm leading-6 text-zinc-200">{wide ? <ColoredText text={displayed} /> : displayed}</dd>
                </div>;
              })}
            </dl>
            <DialogFooter><Button type="button" onClick={() => setArsenalDetail(null)}>Fechar</Button></DialogFooter>
          </> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
function ResourceCard({
  icon: Icon,
  label,
  current,
  max,
  tone,
  onDown,
  onUp,
}: {
  icon: typeof Heart;
  label: string;
  current: number;
  max: number;
  tone: "rose" | "violet";
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <article className="grim-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-zinc-400">
          <Icon
            size={17}
            className={tone === "rose" ? "text-rose-300" : "text-violet-300"}
          />
          {label}
        </span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onDown}
            aria-label={`Diminuir ${label}`}
          >
            <Minus />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onUp}
            aria-label={`Aumentar ${label}`}
          >
            <Plus />
          </Button>
        </div>
      </div>
      <strong className="mt-3 block text-3xl">
        {current}
        <span className="text-lg font-normal text-zinc-600"> / {max}</span>
      </strong>
      <Progress
        value={max ? Math.min(100, (current / max) * 100) : 0}
        className="mt-3 h-1.5"
      />
    </article>
  );
}
function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid place-items-center border-r border-white/[.06] last:border-0">
      <span className="text-xs text-zinc-600">{label}</span>
      <strong className="mt-1 text-2xl">{value}</strong>
    </div>
  );
}
function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Heart;
  children: React.ReactNode;
}) {
  return (
    <section className="grim-card mt-5 rounded-2xl p-5 first:mt-0">
      <h2 className="mb-5 flex items-center gap-2 font-serif text-xl">
        <Icon size={18} className="text-violet-300" />
        {title}
      </h2>
      {children}
    </section>
  );
}
function InfoGrid({ entries }: { entries: [string, unknown][] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-white/[.03] p-3">
          <dt className="text-xs text-zinc-600">{label}</dt>
          <dd className="mt-1 text-sm">{String(value ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}
function Text({ title, value }: { title: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="mt-5 first:mt-0">
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      <ColoredText text={String(value)} className="mt-2 block text-sm leading-7 text-zinc-500" />
    </div>
  );
}
function List({ rows, onOpen }: { rows: Row[]; onOpen?: (row: Row) => void }) {
  return (
    <ul className="space-y-2">
      {rows.map((r, index) => (
        <li
          key={String(r.id ?? index)}
          className="rounded-xl bg-white/[.03] p-3"
        >
          {onOpen ? <button type="button" onClick={() => onOpen(r)} className="text-left text-sm font-semibold underline-offset-4 hover:text-violet-200 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">{String(r.name ?? "Sem nome")}</button> : <strong className="text-sm">{String(r.name ?? "Sem nome")}</strong>}
          {r.rank_name ? (
            <span className="ml-2 text-xs text-violet-300">
              {String(r.rank_name)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
function Empty() {
  return <p className="text-sm text-zinc-600">Nenhum registro nesta seção.</p>;
}
