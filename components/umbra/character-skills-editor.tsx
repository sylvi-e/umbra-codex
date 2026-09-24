"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColoredText, ColoredTextarea } from "@/components/umbra/colored-text";
import { createClient } from "@/lib/supabase/client";

type Skill = {
  id: string;
  name: string;
  category: string | null;
  rank_name: string | null;
  description: string | null;
  effect: string | null;
};

const emptySkill = { name: "", category: "", rank_name: "", description: "", effect: "" };
type SkillForm = typeof emptySkill;

export function CharacterSkillsEditor({ characterId }: { characterId?: string }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SkillForm>(emptySkill);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!characterId) return;
    const client = createClient();
    if (!client) return;
    const { data, error } = await client
      .from("character_skills")
      .select("id,name,category,rank_name,description,effect")
      .eq("character_id", characterId)
      .order("sort_order")
      .order("created_at");
    if (error) return void toast.error(`Não foi possível carregar as habilidades: ${error.message}`);
    setSkills((data ?? []) as Skill[]);
  }, [characterId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function update(field: keyof SkillForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptySkill });
    setOpen(true);
  }

  function startEdit(skill: Skill) {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      category: skill.category ?? "",
      rank_name: skill.rank_name ?? "",
      description: skill.description ?? "",
      effect: skill.effect ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!characterId || busy) return;
    const name = form.name.trim();
    if (!name) return void toast.error("Informe o nome da habilidade.");
    const client = createClient();
    if (!client) return void toast.error("Não foi possível conectar ao banco.");
    setBusy(true);
    const values = {
      name,
      category: form.category.trim() || null,
      rank_name: form.rank_name.trim() || null,
      description: form.description.trim() || null,
      effect: form.effect.trim() || null,
    };
    const result = editingId
      ? await client.from("character_skills").update(values).eq("id", editingId).eq("character_id", characterId).select("id").single()
      : await client.from("character_skills").insert({ ...values, character_id: characterId }).select("id").single();
    setBusy(false);
    if (result.error) return void toast.error(`Não foi possível salvar a habilidade: ${result.error.message}`);
    setOpen(false);
    toast.success(editingId ? "Habilidade atualizada" : "Habilidade adicionada");
    await load();
  }

  return (
    <section className="grim-card mt-6 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl"><Swords size={20} className="text-violet-300" /> Habilidades</h2>
          <p className="mt-1 text-sm text-zinc-500">Registre as habilidades deste personagem.</p>
        </div>
        <Button type="button" onClick={startCreate} disabled={!characterId}><Plus /> Adicionar habilidade</Button>
      </div>
      {!characterId ? (
        <p className="mt-5 text-sm text-zinc-500">Salve a ficha para adicionar habilidades.</p>
      ) : skills.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => (
            <li key={skill.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[.07] bg-black/20 p-4">
              <div className="min-w-0">
                <h3 className="font-medium text-zinc-100">{skill.name}</h3>
                {[skill.category, skill.rank_name].filter(Boolean).length ? <p className="mt-1 text-xs text-violet-300">{[skill.category, skill.rank_name].filter(Boolean).join(" · ")}</p> : null}
                {skill.description ? <ColoredText text={skill.description} className="mt-2 block text-sm text-zinc-400" /> : null}
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(skill)} aria-label={`Editar ${skill.name}`}><Pencil size={16} /></Button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-5 text-sm text-zinc-500">Nenhuma habilidade registrada.</p>}
      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent className="border-white/10 bg-[#100e16] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar habilidade" : "Adicionar habilidade"}</DialogTitle>
            <DialogDescription>O nome é obrigatório; os demais campos são opcionais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {(["name", "category", "rank_name"] as const).map((field) => (
              <div key={field} className={field === "name" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                <Label htmlFor={`skill-${field}`}>{field === "name" ? "Nome *" : field === "category" ? "Categoria" : "Rank"}</Label>
                <Input id={`skill-${field}`} value={form[field]} onChange={(event) => update(field, event.target.value)} className="border-white/10 bg-black/25" />
              </div>
            ))}
            {(["description", "effect"] as const).map((field) => (
              <div key={field} className="space-y-2 sm:col-span-2">
                <Label htmlFor={`skill-${field}`}>{field === "description" ? "Descrição" : "Efeito"}</Label>
                <ColoredTextarea id={`skill-${field}`} value={form[field]} onChange={(value) => update(field, value)} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Salvando..." : "Salvar habilidade"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
