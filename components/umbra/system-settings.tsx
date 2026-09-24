"use client";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeading } from "@/components/umbra/page-heading";
import { createClient } from "@/lib/supabase/client";
type Option = {
  id: string;
  group_key: string;
  label: string;
  value: string;
  sort_order: number;
  active: boolean;
};
export function SystemSettings() {
  const [siteName, setSiteName] = useState("Umbra Codex");
  const [primaryColor, setPrimaryColor] = useState("#8b5cf6");
  const [options, setOptions] = useState<Option[]>([]);
  async function load() {
    const c = createClient()!;
    const [s, o] = await Promise.all([
      c
        .from("system_settings")
        .select("key,value")
        .in("key", ["site_name", "primary_color"]),
      c
        .from("system_options")
        .select("*")
        .order("group_key")
        .order("sort_order"),
    ]);
    for (const row of s.data ?? []) {
      if (row.key === "site_name") setSiteName(String(row.value));
      if (row.key === "primary_color") setPrimaryColor(String(row.value));
    }
    setOptions((o.data ?? []) as Option[]);
  }
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, []);
  async function saveBrand() {
    const { error } = await createClient()!
      .from("system_settings")
      .upsert(
        [
          { key: "site_name", value: siteName },
          { key: "primary_color", value: primaryColor },
        ],
        { onConflict: "key" },
      );
    if (error) toast.error(error.message);
    else toast.success("Identidade visual salva");
  }
  async function addOption(group_key: string) {
    const label = prompt(`Novo valor para ${group_key}`)?.trim();
    if (!label) return;
    const { error } = await createClient()!
      .from("system_options")
      .insert({
        group_key,
        label,
        value: label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_"),
        sort_order: options.filter((o) => o.group_key === group_key).length,
      });
    if (error) toast.error(error.message);
    else void load();
  }
  async function removeOption(id: string) {
    const { error } = await createClient()!
      .from("system_options")
      .update({ active: false })
      .eq("id", id);
    if (error) toast.error(error.message);
    else void load();
  }
  return (
    <>
      <PageHeading
        eyebrow="Sistema configurável"
        title="Configurações"
        description="Ajuste identidade, progressão e opções sem editar o código."
      />
      <Tabs defaultValue="progression">
        <TabsList>
          <TabsTrigger value="progression">Ranks e classes</TabsTrigger>
          <TabsTrigger value="brand">Identidade visual</TabsTrigger>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
        </TabsList>
        <TabsContent value="progression" className="grid gap-5 lg:grid-cols-2">
          <OptionGroup
            title="Ranks"
            group="rank"
            items={options}
            onAdd={addOption}
            onRemove={removeOption}
          />
          <OptionGroup
            title="Classes"
            group="class"
            items={options}
            onAdd={addOption}
            onRemove={removeOption}
          />
          <OptionGroup
            title="Tipos de Memória"
            group="memory_type"
            items={options}
            onAdd={addOption}
            onRemove={removeOption}
          />
        </TabsContent>
        <TabsContent value="brand">
          <section className="grim-card max-w-xl rounded-2xl p-6">
            <h2 className="font-serif text-2xl">Identidade visual</h2>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome do site</Label>
                <Input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor principal</Label>
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button onClick={saveBrand}>
                <Save />
                Salvar
              </Button>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="templates">
          <section className="grim-card rounded-2xl p-6">
            <h2 className="font-serif text-2xl">Modelo Shadow Slave</h2>
            <p className="mt-2 text-zinc-500">
              O modelo inicial inclui Identidade, Combate, Atributos Base,
              Progressão, Aspecto, Defeito, Nome Verdadeiro, Habilidades,
              Memórias, Ecos e Inventário. Atualizações preservam dados
              existentes.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
function OptionGroup({
  title,
  group,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  group: string;
  items: Option[];
  onAdd: (g: string) => void;
  onRemove: (id: string) => void;
}) {
  const visible = items.filter((i) => i.group_key === group && i.active);
  return (
    <section className="grim-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">{title}</h2>
        <Button size="sm" variant="outline" onClick={() => onAdd(group)}>
          <Plus />
          Adicionar
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-xl bg-white/[.03] px-3 py-2"
          >
            <span>{item.label}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemove(item.id)}
              aria-label={`Desativar ${item.label}`}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
