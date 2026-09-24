"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Ghost, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Kind = "inventory" | "memories" | "echoes";
type FormState = Record<string, string | boolean>;
type Row = { id: string; name: string; quantity?: number; state?: string | null; rank_name?: string | null; memory_type?: string | null; class_name?: string | null; category?: string | null };

const defaults: Record<Kind, FormState> = {
  inventory: { name: "", quantity: "1", unit_weight: "0", category: "", rarity: "", state: "", description: "", effect: "", value_amount: "", storage_location: "", equipped: false, notes: "" },
  memories: { name: "", rank_name: "", tier: "", memory_type: "", category: "", enchantments: "", physical_description: "", description: "", mechanical_effects: "", damage_text: "", defense_text: "", range_text: "", essence_cost: "", state: "stored", history: "", requirements: "", notes: "" },
  echoes: { name: "", rank_name: "", class_name: "", creature_type: "", state: "", enchantments: "", appearance: "", description: "", personality: "", origin: "", loyalty: "", summon_condition: "", summon_cost: "", notes: "" },
};

const groups = {
  inventory: { title: "Inventário", singular: "item", description: "Itens comuns, recursos e equipamentos.", table: "inventory_items", icon: Package, tone: "border-amber-400/20 bg-amber-500/[.055] text-amber-300" },
  memories: { title: "Memórias", singular: "memória", description: "Armas, armaduras e relíquias da alma.", table: "character_memories", icon: Archive, tone: "border-violet-400/20 bg-violet-500/[.055] text-violet-300" },
  echoes: { title: "Ecos", singular: "eco", description: "Criaturas vinculadas ao personagem.", table: "character_echoes", icon: Ghost, tone: "border-cyan-400/20 bg-cyan-500/[.055] text-cyan-300" },
} as const;

const numeric: Record<Kind, string[]> = { inventory: ["quantity", "unit_weight", "value_amount"], memories: ["tier", "essence_cost"], echoes: [] };

const tiers = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const detailLabels: Record<Kind, Record<string, string>> = {
  inventory: { name: "Nome", quantity: "Quantidade carregada", unit_weight: "Peso por unidade", category: "Categoria", rarity: "Raridade", state: "Estado", description: "Descrição", effect: "Efeito", value_amount: "Valor", storage_location: "Local de armazenamento", equipped: "Equipado", notes: "Observações" },
  memories: { name: "Nome", rank_name: "Rank", tier: "Tier", memory_type: "Tipo", category: "Categoria", enchantments: "Encantamentos", physical_description: "Descrição física", description: "Descrição", mechanical_effects: "Efeitos mecânicos", damage_text: "Dano", defense_text: "Defesa", range_text: "Alcance", essence_cost: "Custo de Essência", state: "Estado", history: "História", requirements: "Requisitos", notes: "Observações" },
  echoes: { name: "Nome", rank_name: "Rank", class_name: "Classe", creature_type: "Tipo de criatura", state: "Estado", enchantments: "Encantamentos", appearance: "Descrição física", description: "Descrição", personality: "Personalidade ou comportamento", origin: "Origem", loyalty: "Lealdade", summon_condition: "Condição para invocação", summon_cost: "Custo para invocar", notes: "Observações" },
};

function Field({ label, name, form, setForm, number = false }: { label: string; name: string; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; number?: boolean }) {
  return <div className="space-y-2"><Label htmlFor={`arsenal-${name}`}>{label}</Label><Input id={`arsenal-${name}`} type={number ? "number" : "text"} min={number ? 0 : undefined} step={number ? "any" : undefined} value={String(form[name] ?? "")} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className="border-white/10 bg-black/25" /></div>;
}

function LongField({ label, name, form, setForm }: { label: string; name: string; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return <div className="space-y-2 sm:col-span-2"><Label htmlFor={`arsenal-${name}`}>{label}</Label><Textarea id={`arsenal-${name}`} value={String(form[name] ?? "")} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} className="min-h-24 border-white/10 bg-black/25" /></div>;
}

function TierField({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return <div className="space-y-2"><Label htmlFor="arsenal-tier">Tier</Label><Select value={String(form.tier ?? "")} onValueChange={(value) => setForm((current) => ({ ...current, tier: value }))}><SelectTrigger id="arsenal-tier" className="w-full border-white/10 bg-black/25"><SelectValue placeholder="Selecione o Tier" /></SelectTrigger><SelectContent>{tiers.map((tier, index) => <SelectItem key={tier} value={String(index + 1)}>{tier}</SelectItem>)}</SelectContent></Select></div>;
}

function ArsenalForm({ kind, form, setForm }: { kind: Kind; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  if (kind === "inventory") return <>
    <Field label="Nome do item *" name="name" form={form} setForm={setForm} /><Field label="Quantidade carregada *" name="quantity" number form={form} setForm={setForm} />
    <Field label="Categoria" name="category" form={form} setForm={setForm} /><Field label="Raridade" name="rarity" form={form} setForm={setForm} />
    <Field label="Peso por unidade" name="unit_weight" number form={form} setForm={setForm} /><Field label="Valor" name="value_amount" number form={form} setForm={setForm} />
    <Field label="Estado" name="state" form={form} setForm={setForm} /><Field label="Local de armazenamento" name="storage_location" form={form} setForm={setForm} />
    <LongField label="Descrição" name="description" form={form} setForm={setForm} /><LongField label="Efeito" name="effect" form={form} setForm={setForm} /><LongField label="Observações" name="notes" form={form} setForm={setForm} />
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:col-span-2"><input type="checkbox" checked={Boolean(form.equipped)} onChange={(event) => setForm((current) => ({ ...current, equipped: event.target.checked }))} className="size-4 accent-amber-400" /><span className="text-sm font-medium">Item equipado</span></label>
  </>;
  if (kind === "memories") return <>
    <Field label="Nome da Memória *" name="name" form={form} setForm={setForm} /><Field label="Rank" name="rank_name" form={form} setForm={setForm} />
    <Field label="Tipo" name="memory_type" form={form} setForm={setForm} /><TierField form={form} setForm={setForm} />
    <Field label="Categoria" name="category" form={form} setForm={setForm} /><Field label="Estado" name="state" form={form} setForm={setForm} />
    <Field label="Dano" name="damage_text" form={form} setForm={setForm} /><Field label="Defesa" name="defense_text" form={form} setForm={setForm} />
    <Field label="Alcance" name="range_text" form={form} setForm={setForm} /><Field label="Custo de Essência" name="essence_cost" number form={form} setForm={setForm} />
    <Field label="Requisitos" name="requirements" form={form} setForm={setForm} />
    <LongField label="Encantamentos (um por linha)" name="enchantments" form={form} setForm={setForm} /><LongField label="Descrição física" name="physical_description" form={form} setForm={setForm} />
    <LongField label="Descrição" name="description" form={form} setForm={setForm} /><LongField label="Efeitos mecânicos" name="mechanical_effects" form={form} setForm={setForm} /><LongField label="História" name="history" form={form} setForm={setForm} /><LongField label="Observações" name="notes" form={form} setForm={setForm} />
  </>;
  return <>
    <Field label="Nome do Eco *" name="name" form={form} setForm={setForm} /><Field label="Rank" name="rank_name" form={form} setForm={setForm} />
    <Field label="Classe" name="class_name" form={form} setForm={setForm} /><Field label="Tipo de criatura" name="creature_type" form={form} setForm={setForm} />
    <Field label="Estado" name="state" form={form} setForm={setForm} /><Field label="Origem" name="origin" form={form} setForm={setForm} />
    <Field label="Lealdade" name="loyalty" form={form} setForm={setForm} /><Field label="Custo para invocar" name="summon_cost" form={form} setForm={setForm} />
    <LongField label="Encantamentos" name="enchantments" form={form} setForm={setForm} /><LongField label="Descrição física" name="appearance" form={form} setForm={setForm} />
    <LongField label="Descrição" name="description" form={form} setForm={setForm} /><LongField label="Personalidade ou comportamento" name="personality" form={form} setForm={setForm} /><LongField label="Condição para invocação" name="summon_condition" form={form} setForm={setForm} /><LongField label="Observações" name="notes" form={form} setForm={setForm} />
  </>;
}

export function CharacterArsenalEditor({ characterId }: { characterId?: string }) {
  const [rows, setRows] = useState<Record<Kind, Row[]>>({ inventory: [], memories: [], echoes: [] });
  const [modalKind, setModalKind] = useState<Kind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ kind: Kind; values: Record<string, unknown> } | null>(null);
  const [form, setForm] = useState<FormState>({ ...defaults.inventory });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!characterId) return;
    const client = createClient(); if (!client) return;
    const [inventory, memories, echoes] = await Promise.all([
      client.from("inventory_items").select("id,name,quantity,state,category").eq("character_id", characterId).order("created_at"),
      client.from("character_memories").select("id,name,state,rank_name,memory_type").eq("character_id", characterId).order("created_at"),
      client.from("character_echoes").select("id,name,state,rank_name,class_name").eq("character_id", characterId).order("created_at"),
    ]);
    const error = inventory.error ?? memories.error ?? echoes.error;
    if (error) return void toast.error(`Não foi possível carregar o arsenal: ${error.message}`);
    setRows({ inventory: (inventory.data ?? []) as Row[], memories: (memories.data ?? []) as Row[], echoes: (echoes.data ?? []) as Row[] });
  }, [characterId]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function openCreate(kind: Kind) { setEditingId(null); setForm({ ...defaults[kind] }); setModalKind(kind); }

  async function fetchDetails(kind: Kind, id: string) {
    const client = createClient()!;
    const { data, error } = await client.from(groups[kind].table).select("*").eq("id", id).single();
    if (error) { toast.error(error.message); return null; }
    const values = { ...data } as Record<string, unknown>;
    if (kind === "memories") {
      const enchantments = await client.from("memory_enchantments").select("name").eq("memory_id", id).order("sort_order");
      if (enchantments.error) { toast.error(enchantments.error.message); return null; }
      values.enchantments = (enchantments.data ?? []).map((item: { name: string }) => item.name).join("\n");
    }
    return values;
  }

  async function openView(kind: Kind, row: Row) {
    const values = await fetchDetails(kind, row.id);
    if (values) setViewing({ kind, values });
  }

  async function openEdit(kind: Kind, row: Row) {
    const values = await fetchDetails(kind, row.id);
    if (!values) return;
    const next = { ...defaults[kind] };
    for (const key of Object.keys(next)) {
      const value = values[key];
      next[key] = typeof value === "boolean" ? value : value === null || value === undefined ? "" : String(value);
    }
    setViewing(null); setEditingId(row.id); setForm(next); setModalKind(kind);
  }

  async function save() {
    if (!characterId || !modalKind) return;
    const name = String(form.name ?? "").trim();
    if (!name) return void toast.error("O nome é obrigatório.");
    if (modalKind === "inventory" && Number(form.quantity) < 0) return void toast.error("A quantidade não pode ser negativa.");
    setBusy(true);
    const payload: Record<string, string | number | boolean> = { character_id: characterId, name };
    for (const [key, value] of Object.entries(form)) {
      if (key === "name" || key === "enchantments" && modalKind === "memories" || value === "") continue;
      payload[key] = numeric[modalKind].includes(key) ? Number(value) : value;
    }
    const client = createClient()!;
    const query = editingId
      ? client.from(groups[modalKind].table).update(payload).eq("id", editingId)
      : client.from(groups[modalKind].table).insert(payload);
    const { data, error } = await query.select("id").single();
    if (!error && modalKind === "memories") {
      const enchantments = String(form.enchantments ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
      if (editingId) {
        const cleared = await client.from("memory_enchantments").delete().eq("memory_id", data.id);
        if (cleared.error) { setBusy(false); return void toast.error(`Não foi possível atualizar os encantamentos: ${cleared.error.message}`); }
      }
      if (enchantments.length) {
        const result = await client.from("memory_enchantments").insert(enchantments.map((enchantment, index) => ({ memory_id: data.id, name: enchantment, sort_order: index })));
        if (result.error) { if (!editingId) await client.from("character_memories").delete().eq("id", data.id); setBusy(false); return void toast.error(`Não foi possível salvar os encantamentos: ${result.error.message}`); }
      }
    }
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(editingId ? `${groups[modalKind].singular} atualizado` : `${groups[modalKind].singular} adicionado`); setModalKind(null); setEditingId(null); await load();
  }

  async function remove(kind: Kind, row: Row) {
    if (!window.confirm(`Excluir “${row.name}” permanentemente?`)) return;
    const { error } = await createClient()!.from(groups[kind].table).delete().eq("id", row.id);
    if (error) return void toast.error(error.message);
    setRows((current) => ({ ...current, [kind]: current[kind].filter((item) => item.id !== row.id) }));
  }

  if (!characterId) return <section className="grim-card rounded-2xl p-6 text-center"><Package className="mx-auto text-violet-300" /><h2 className="mt-3 font-serif text-xl">Arsenal aguardando a ficha</h2><p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">Informe um nome válido e salve a ficha. Depois disso, itens, Memórias e Ecos poderão ser adicionados aqui.</p></section>;

  return <section className="grim-card rounded-2xl p-4 sm:p-6">
    <div className="mb-5"><h2 className="font-serif text-2xl">Arsenal e companheiros</h2><p className="mt-1 text-sm text-zinc-500">Gerencie os itens, relíquias e criaturas vinculados ao personagem.</p></div>
    <div className="grid gap-4 xl:grid-cols-3">
      {(Object.keys(groups) as Kind[]).map((kind) => { const group = groups[kind]; const Icon = group.icon; return <article key={kind} className={`rounded-2xl border p-4 ${group.tone}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-current/10"><Icon aria-hidden="true" size={19} /></span><div><h3 className="font-semibold text-zinc-100">{group.title}</h3><p className="mt-0.5 text-xs leading-5 text-zinc-500">{group.description}</p></div></div><span className="rounded-full bg-black/25 px-2 py-1 text-xs font-semibold">{rows[kind].length}</span></div>
        <Button type="button" onClick={() => openCreate(kind)} className="mt-4 w-full bg-white/10 text-white hover:bg-white/15"><Plus aria-hidden="true" /> Adicionar {group.singular}</Button>
        <ul className="mt-4 space-y-2">{rows[kind].map((row) => { const detail = kind === "inventory" ? `${row.quantity ?? 0} carregado(s)${row.category ? ` • ${row.category}` : ""}` : [row.rank_name, kind === "memories" ? row.memory_type : row.class_name, row.state].filter(Boolean).join(" • ") || "Registrado"; return <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.06] bg-black/20 px-3 py-2.5"><div className="min-w-0"><button type="button" onClick={() => void openView(kind, row)} className="block max-w-full truncate text-left text-sm font-medium text-zinc-200 underline-offset-4 hover:text-white hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">{row.name}</button><p className="mt-0.5 truncate text-xs text-zinc-500">{detail}</p></div><div className="flex shrink-0"><Button type="button" size="icon" variant="ghost" onClick={() => void openEdit(kind, row)} aria-label={`Editar ${row.name}`} className="size-8 text-zinc-500 hover:text-violet-300"><Pencil size={15} /></Button><Button type="button" size="icon" variant="ghost" onClick={() => void remove(kind, row)} aria-label={`Excluir ${row.name}`} className="size-8 text-zinc-500 hover:text-rose-300"><Trash2 size={15} /></Button></div></li>; })}{!rows[kind].length ? <li className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-zinc-600">Nenhum registro ainda.</li> : null}</ul>
      </article>; })}
    </div>
    <Dialog open={modalKind !== null} onOpenChange={(open) => { if (!open && !busy) { setModalKind(null); setEditingId(null); } }}><DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#100e16] sm:max-w-3xl">{modalKind ? <><DialogHeader><DialogTitle className="font-serif text-2xl">{editingId ? "Editar" : "Adicionar"} {groups[modalKind].singular}</DialogTitle><DialogDescription>{editingId ? "Altere os campos desejados e salve." : "Preencha os detalhes que desejar. Apenas o nome é obrigatório."}</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><ArsenalForm kind={modalKind} form={form} setForm={setForm} /></div><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => { setModalKind(null); setEditingId(null); }}>Cancelar</Button><Button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Salvando..." : "Salvar"}</Button></DialogFooter></> : null}</DialogContent></Dialog>
    <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) setViewing(null); }}><DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#100e16] sm:max-w-2xl">{viewing ? <><DialogHeader><DialogTitle className="font-serif text-2xl">{String(viewing.values.name)}</DialogTitle><DialogDescription>Todos os detalhes registrados para este {groups[viewing.kind].singular}.</DialogDescription></DialogHeader><dl className="grid gap-3 py-2 sm:grid-cols-2">{Object.entries(detailLabels[viewing.kind]).map(([key, label]) => { const value = viewing.values[key]; if (value === null || value === undefined || value === "") return null; const displayed = key === "tier" ? tiers[Number(value) - 1] ?? String(value) : typeof value === "boolean" ? value ? "Sim" : "Não" : String(value); const wide = ["description", "physical_description", "appearance", "effect", "mechanical_effects", "enchantments", "history", "notes", "personality", "summon_condition"].includes(key); return <div key={key} className={`rounded-xl border border-white/[.07] bg-black/20 p-3 ${wide ? "sm:col-span-2" : ""}`}><dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">{displayed}</dd></div>; })}</dl><DialogFooter><Button type="button" variant="outline" onClick={() => setViewing(null)}>Fechar</Button><Button type="button" onClick={() => void openEdit(viewing.kind, { id: String(viewing.values.id), name: String(viewing.values.name) })}><Pencil aria-hidden="true" /> Editar</Button></DialogFooter></> : null}</DialogContent></Dialog>
  </section>;
}
