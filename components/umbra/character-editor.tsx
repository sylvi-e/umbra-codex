"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  Activity,
  Check,
  Cloud,
  CloudUpload,
  Footprints,
  HeartPulse,
  LoaderCircle,
  Minus,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeading } from "@/components/umbra/page-heading";
import { CharacterArsenalEditor } from "@/components/umbra/character-arsenal-editor";
import { CharacterSkillsEditor } from "@/components/umbra/character-skills-editor";
import { CharacterNotesBoard } from "@/components/umbra/character-notes";
import { CharacterPortraitEditor } from "@/components/umbra/character-portrait";
import { ColoredTextarea } from "@/components/umbra/colored-text";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  calculateAttributeModifier,
  formatAttributeModifier,
} from "@/lib/character-rules";
import type { SaveState } from "@/lib/types";
const numeric = z.coerce.number().finite();
const attribute = z.object({
  key: z.string(),
  label: z.string(),
  base: numeric,
  notes: z.string(),
});
const schema = z.object({
  name: z.string().min(2, "O nome precisa ter ao menos 2 caracteres."),
  portraitUrl: z.string(),
  trueName: z.string(),
  status: z.string(),
  age: z.string(),
  gender: z.string(),
  pronouns: z.string(),
  origin: z.string(),
  birthplace: z.string(),
  affiliation: z.string(),
  occupation: z.string(),
  physicalDescription: z.string(),
  personality: z.string(),
  history: z.string(),
  objectives: z.string(),
  privateNotes: z.string(),
  currentHp: numeric.min(0),
  maxHp: numeric.min(0),
  tempHp: numeric.min(0),
  armorClass: numeric,
  magicResistance: numeric,
  movement: numeric,
  initiative: numeric,
  dodge: numeric,
  damageReduction: numeric,
  currentEssence: numeric.min(0),
  maxEssence: numeric.min(0),
  rankName: z.string(),
  className: z.string(),
  soulCores: numeric.int().min(1).max(7),
  maxSoulCores: numeric.int().min(7).max(7),
  fragments: numeric.min(0),
  nextCoreFragments: numeric.min(1),
  aspectRank: z.string(),
  soulRank: z.string(),
  lineage: z.string(),
  aspectLegacy: z.string(),
  corruption: numeric.min(0),
  attributes: z.array(attribute),
  aspectName: z.string(),
  aspectDescription: z.string(),
  aspectMechanic: z.string(),
  flawName: z.string(),
  flawDescription: z.string(),
  flawMechanic: z.string(),
  trueNameMeaning: z.string(),
  trueNameEffect: z.string(),
});
type FormValues = z.infer<typeof schema>;
type DbStatRow = {
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
type RankOption = {
  label: string;
};

function getSaveErrorMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof reason.message === "string"
  ) {
    return reason.message;
  }
  return "Erro ao salvar";
}
const baseAttributes = [
  "Força",
  "Destreza",
  "Constituição",
  "Inteligência",
  "Sabedoria",
  "Percepção",
  "Interpessoal",
];
const defaults: FormValues = {
  name: "",
  portraitUrl: "",
  trueName: "",
  status: "active",
  age: "",
  gender: "",
  pronouns: "",
  origin: "",
  birthplace: "",
  affiliation: "",
  occupation: "",
  physicalDescription: "",
  personality: "",
  history: "",
  objectives: "",
  privateNotes: "",
  currentHp: 10,
  maxHp: 10,
  tempHp: 0,
  armorClass: 0,
  magicResistance: 0,
  movement: 6,
  initiative: 0,
  dodge: 0,
  damageReduction: 0,
  currentEssence: 10,
  maxEssence: 10,
  rankName: "Dormente",
  className: "Besta",
  soulCores: 1,
  maxSoulCores: 7,
  fragments: 0,
  nextCoreFragments: 1000,
  aspectRank: "",
  soulRank: "Dormente",
  lineage: "",
  aspectLegacy: "",
  corruption: 0,
  attributes: baseAttributes.map((label) => ({
    key: label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s/g, "_"),
    label,
    base: 0,
    notes: "",
  })),
  aspectName: "",
  aspectDescription: "",
  aspectMechanic: "",
  flawName: "",
  flawDescription: "",
  flawMechanic: "",
  trueNameMeaning: "",
  trueNameEffect: "",
};
export function CharacterEditor({ characterId, kind = "player" }: { characterId?: string; kind?: "player" | "npc" }) {
  const router = useRouter();
  const isNpc = kind === "npc";
  const basePath = isNpc ? "/npcs" : "/fichas";
  const { user } = useAuth();
  const [activeId, setActiveId] = useState(characterId);
  const [loading, setLoading] = useState(Boolean(characterId));
  const [rankOptions, setRankOptions] = useState<string[]>([]);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const hydrated = useRef(!characterId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attributes",
  });
  useEffect(() => {
    const client = createClient();
    if (!client) return;

    async function loadProgressionOptions() {
      const [ranks, classes] = await Promise.all([
        client
          .from("system_options")
          .select("label")
          .eq("group_key", "rank")
          .eq("active", true)
          .order("sort_order"),
        client
          .from("system_options")
          .select("label")
          .eq("group_key", "class")
          .eq("active", true)
          .order("sort_order"),
      ]);
      if (ranks.error || classes.error) {
        toast.error(
          `Não foi possível carregar ranks e classes: ${ranks.error?.message ?? classes.error?.message}`,
        );
        return;
      }
      setRankOptions(
        ((ranks.data ?? []) as RankOption[]).map((option) => option.label),
      );
      setClassOptions(
        ((classes.data ?? []) as RankOption[]).map((option) => option.label),
      );
    }

    void loadProgressionOptions();
  }, []);
  useEffect(() => {
    if (!characterId) return;
    const client = createClient();
    if (!client) return;
    void Promise.all([
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
    ])
      .then(([sheetResult, statsResult, aspectResult, flawResult]) => {
        if (sheetResult.error) throw sheetResult.error;
        const s = sheetResult.data;
        if (Boolean(s.is_npc) !== isNpc) {
          router.replace(`${s.is_npc ? "/npcs" : "/fichas"}/${characterId}/editar`);
          return;
        }
        const rawStats = (statsResult.data ?? []) as DbStatRow[];
        const stats = new Map<string, DbStatRow>(
          rawStats.map((row) => [row.stat_key, row]),
        );
        const attrRows = rawStats.filter(
          (row) => row.category === "base_attribute",
        );
        form.reset({
          ...defaults,
          name: s.name,
          portraitUrl: s.portrait_url ?? "",
          trueName: s.true_name ?? "",
          status: s.status,
          age: s.age?.toString() ?? "",
          gender: s.gender ?? "",
          pronouns: s.pronouns ?? "",
          origin: s.origin ?? "",
          birthplace: s.birthplace ?? "",
          affiliation: s.affiliation ?? "",
          occupation: s.occupation ?? "",
          physicalDescription: s.physical_description ?? "",
          personality: s.personality ?? "",
          history: s.backstory ?? "",
          objectives: s.objectives ?? "",
          privateNotes: s.private_notes ?? "",
          currentHp: stats.get("hp")?.current_value ?? 10,
          maxHp: stats.get("hp")?.max_value ?? 10,
          tempHp: stats.get("hp")?.temporary_bonus ?? 0,
          armorClass: stats.get("armor_class")?.base_value ?? 0,
          magicResistance: stats.get("magic_resistance")?.base_value ?? 0,
          movement: stats.get("movement")?.base_value ?? 6,
          initiative: stats.get("initiative")?.base_value ?? 0,
          dodge: stats.get("dodge")?.base_value ?? 0,
          damageReduction: stats.get("damage_reduction")?.base_value ?? 0,
          currentEssence: stats.get("essence")?.current_value ?? 10,
          maxEssence: stats.get("essence")?.max_value ?? 10,
          rankName: s.rank_name ?? "Dormente",
          className: s.class_name ?? "Besta",
          soulCores: Math.min(7, Math.max(1, s.soul_cores ?? 1)),
          maxSoulCores: 7,
          fragments: s.soul_fragments ?? 0,
          nextCoreFragments: Math.min(7, Math.max(1, s.soul_cores ?? 1)) * 1000,
          aspectRank: s.aspect_rank ?? "",
          soulRank: s.soul_rank ?? "Dormente",
          lineage: s.lineage ?? "",
          aspectLegacy: s.aspect_legacy ?? "",
          corruption: s.corruption ?? 0,
          attributes: attrRows.length
            ? attrRows.map((row) => ({
                key: row.stat_key,
                label: row.label,
                base: row.base_value,
                notes: row.notes ?? "",
              }))
            : defaults.attributes,
          aspectName: aspectResult.data?.name ?? "",
          aspectDescription: aspectResult.data?.description ?? "",
          aspectMechanic: aspectResult.data?.mechanic ?? "",
          flawName: flawResult.data?.name ?? "",
          flawDescription: flawResult.data?.narrative_description ?? "",
          flawMechanic: flawResult.data?.mechanical_effect ?? "",
          trueNameMeaning: s.true_name_meaning ?? "",
          trueNameEffect: s.true_name_effect ?? "",
        });
        hydrated.current = true;
      })
      .catch((reason) => {
        toast.error(
          reason instanceof Error ? reason.message : "Ficha não encontrada",
        );
        router.replace(basePath);
      })
      .finally(() => setLoading(false));
  }, [characterId, form, router]);
  useEffect(() => {
    const subscription = form.watch(() => {
      if (!hydrated.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 900);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [activeId, user]);
  async function save() {
    if (!user) return;
    const valid = await form.trigger();
    if (!valid) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    const v = form.getValues();
    const client = createClient();
    if (!client) return;
    try {
      let id = activeId;
      const sheet = {
        name: v.name,
        portrait_url: v.portraitUrl || null,
        true_name: v.trueName || null,
        status: v.status,
        age: v.age ? Number(v.age) : null,
        gender: v.gender || null,
        pronouns: v.pronouns || null,
        origin: v.origin || null,
        birthplace: v.birthplace || null,
        affiliation: v.affiliation || null,
        occupation: v.occupation || null,
        physical_description: v.physicalDescription || null,
        personality: v.personality || null,
        backstory: v.history || null,
        objectives: v.objectives || null,
        private_notes: v.privateNotes || null,
        rank_name: v.rankName || null,
        class_name: v.className || null,
        soul_cores: v.soulCores,
        max_soul_cores: 7,
        soul_fragments: v.fragments,
        next_core_fragments: v.soulCores * 1000,
        aspect_rank: v.aspectRank || null,
        soul_rank: v.soulRank || null,
        lineage: v.lineage || null,
        aspect_legacy: v.aspectLegacy || null,
        corruption: v.corruption,
        true_name_meaning: v.trueNameMeaning || null,
        true_name_effect: v.trueNameEffect || null,
        updated_at: new Date().toISOString(),
      };
      if (id) {
        const { error } = await client
          .from("character_sheets")
          .update(sheet)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await client
          .from("character_sheets")
          .insert({ ...sheet, owner_id: user.id, is_npc: isNpc })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        setActiveId(id);
        router.replace(`${basePath}/${id}/editar`);
      }
      if (!id) throw new Error("Não foi possível identificar a ficha salva.");
      const characterKey = id;
      const stats = [
        stat(characterKey, "hp", "HP", "resource", v.maxHp, v.currentHp, 0, v.tempHp),
        stat(
          characterKey,
          "essence",
          "Essência",
          "resource",
          v.maxEssence,
          v.currentEssence,
        ),
        stat(characterKey, "armor_class", "CA", "combat", null, null, v.armorClass),
        stat(
          characterKey,
          "magic_resistance",
          "MR",
          "combat",
          null,
          null,
          v.magicResistance,
        ),
        stat(characterKey, "movement", "Deslocamento", "combat", null, null, v.movement),
        stat(
          characterKey,
          "initiative",
          "Iniciativa",
          "combat",
          null,
          null,
          v.initiative,
        ),
        stat(characterKey, "dodge", "Esquiva", "combat", null, null, v.dodge),
        stat(
          characterKey,
          "damage_reduction",
          "Redução de dano",
          "combat",
          null,
          null,
          v.damageReduction,
        ),
        ...v.attributes.map((a) => ({
          character_id: characterKey,
          stat_key: a.key,
          label: a.label,
          category: "base_attribute",
          base_value: a.base,
          temporary_bonus: calculateAttributeModifier(a.base),
          penalty: 0,
          current_value: null,
          max_value: null,
          notes: a.notes || null,
        })),
      ];
      const { error: statsError } = await client
        .from("character_stats")
        .upsert(stats, { onConflict: "character_id,stat_key" });
      if (statsError) throw statsError;
      const currentAttributeKeys = new Set(v.attributes.map((attribute) => attribute.key));
      const { data: storedAttributes, error: storedAttributesError } = await client
        .from("character_stats")
        .select("stat_key")
        .eq("character_id", characterKey)
        .eq("category", "base_attribute");
      if (storedAttributesError) throw storedAttributesError;
      const removedAttributeKeys = (storedAttributes ?? [])
        .map((attribute: { stat_key: string }) => attribute.stat_key)
        .filter((key: string) => !currentAttributeKeys.has(key));
      if (removedAttributeKeys.length) {
        const { error: deleteAttributesError } = await client
          .from("character_stats")
          .delete()
          .eq("character_id", characterKey)
          .eq("category", "base_attribute")
          .in("stat_key", removedAttributeKeys);
        if (deleteAttributesError) throw deleteAttributesError;
      }
      if (v.aspectName) {
        const { error } = await client
          .from("character_aspects")
          .upsert(
            {
              character_id: characterKey,
              is_primary: true,
              name: v.aspectName,
              rank_name: v.aspectRank || null,
              description: v.aspectDescription || null,
              mechanic: v.aspectMechanic || null,
            },
            { onConflict: "character_id,is_primary" },
          );
        if (error) throw error;
      }
      if (v.flawName) {
        const { error } = await client
          .from("character_flaws")
          .upsert(
            {
              character_id: characterKey,
              name: v.flawName,
              narrative_description: v.flawDescription || null,
              mechanical_effect: v.flawMechanic || null,
            },
            { onConflict: "character_id" },
          );
        if (error) throw error;
      }
      setSaveState("saved");
    } catch (reason) {
      setSaveState("error");
      toast.error(getSaveErrorMessage(reason));
    }
  }
  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-500">
        <LoaderCircle className="animate-spin" />
        Abrindo ficha…
      </div>
    );
  return (
    <form onSubmit={form.handleSubmit(() => save())}>
      <PageHeading
        eyebrow={activeId ? (isNpc ? "Editando NPC" : "Editando registro") : (isNpc ? "Novo NPC" : "Novo registro")}
        title={form.watch("name") || (isNpc ? "NPC sem nome" : "Personagem sem nome")}
        description="As alterações válidas são salvas automaticamente."
        action={
          <div className="flex items-center gap-3">
            <SaveIndicator state={saveState} />
            <Button type="submit" variant="outline" className="border-white/10">
              <Save />
              Salvar agora
            </Button>
          </div>
        }
      />
      <Tabs defaultValue="identity" className="gap-3">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-white/[.035] p-1 sm:w-fit">
          <TabsTrigger className="flex-none px-3 sm:px-4" value="identity">Identidade</TabsTrigger>
          <TabsTrigger className="flex-none px-3 sm:px-4" value="combat">Combate</TabsTrigger>
          <TabsTrigger className="flex-none px-3 sm:px-4" value="attributes">Atributos base</TabsTrigger>
          <TabsTrigger className="flex-none px-3 sm:px-4" value="progression">Progressão</TabsTrigger>
          <TabsTrigger className="flex-none px-3 sm:px-4" value="supernatural">Aspecto e Defeito</TabsTrigger>
          <TabsTrigger className="flex-none px-3 sm:px-4" value="arsenal">Arsenal</TabsTrigger>
          <TabsTrigger className="flex-none px-3 sm:px-4" value="notes">Notas</TabsTrigger>
        </TabsList>
        <TabsContent value="identity">
          <CharacterPortraitEditor characterId={activeId} value={form.watch("portraitUrl")} onChange={(url) => form.setValue("portraitUrl", url, { shouldDirty: true })} />
          <Section
            title="Identidade"
            description="Informações públicas e narrativas do personagem."
          >
            <Grid>
              <Field form={form} name="name" label="Nome do personagem" />
              <Field form={form} name="trueName" label="Nome Verdadeiro" />
              <Field form={form} name="age" label="Idade" />
              <Field form={form} name="gender" label="Gênero" />
              <Field
                form={form}
                name="affiliation"
                label="Clã ou organização"
              />
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) =>
                    form.setValue("status", value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="missing">Desaparecido</SelectItem>
                    <SelectItem value="corrupted">Corrompido</SelectItem>
                    <SelectItem value="dead">Morto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Grid>
            {(
              [
                "personality",
                "history",
                "privateNotes",
              ] as const
            ).map((name) => (
              <LongField
                key={name}
                form={form}
                name={name}
                label={
                  {
                    personality: "Personalidade",
                    history: "História",
                    privateNotes: "Anotações privadas",
                  }[name]
                }
              />
            ))}
          </Section>
        </TabsContent>
        <TabsContent value="combat">
          <Section
            title="Status e combate"
            description="Recursos atuais, defesas e movimentação."
          >
            <CombatStatus form={form} />
          </Section>
        </TabsContent>
        <TabsContent value="attributes">
          <Section
            title="Atributos base"
            description="A Base 0 concede −1; Base 1 concede +0. A partir da Base 2, cada 2 pontos concedem +1."
          >
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-4 md:grid-cols-[1.2fr_repeat(3,.7fr)_auto]"
                >
                  <Field
                    form={form}
                    name={`attributes.${index}.label`}
                    label="Atributo"
                  />
                  <Field
                    form={form}
                    name={`attributes.${index}.base`}
                    label="Base"
                    type="number"
                  />
                  <div>
                    <Label>Bônus</Label>
                    <output className="mt-2 block h-10 rounded-md border border-violet-400/20 bg-violet-500/[.07] px-3 py-2 font-semibold text-violet-200">
                      {formatAttributeModifier(
                        calculateAttributeModifier(
                          Number(form.watch(`attributes.${index}.base`)),
                        ),
                      )}
                    </output>
                  </div>
                  <div>
                    <Label>Final</Label>
                    <output className="mt-2 block h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 font-semibold">
                      {formatAttributeModifier(
                        calculateAttributeModifier(
                          Number(form.watch(`attributes.${index}.base`)),
                        ),
                      )}
                    </output>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-7"
                    onClick={() => remove(index)}
                    aria-label="Remover atributo"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 border-white/10"
              onClick={() =>
                append({
                  key: `custom_${Date.now()}`,
                  label: "Novo atributo",
                  base: 0,
                  notes: "",
                })
              }
            >
              <Plus />
              Adicionar atributo
            </Button>
          </Section>
        </TabsContent>
        <TabsContent value="progression">
          <Section
            title="Progressão do Desperto"
            description="Os valores disponíveis são configuráveis pelo administrador."
          >
            <Grid>
              <RankSelect
                form={form}
                name="rankName"
                label="Rank"
                options={rankOptions}
              />
              <RankSelect
                form={form}
                name="className"
                label="Classe"
                options={classOptions}
              />
              <SoulCoreSelect form={form} />
              <Field
                form={form}
                name="fragments"
                label="Fragmentos"
                type="number"
              />
              <div className="space-y-2">
                <Label>Próximo núcleo</Label>
                <output className="block h-10 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                  {Number(form.watch("soulCores")) >= 7
                    ? "Máximo alcançado"
                    : `${Number(form.watch("soulCores")) * 1000} fragmentos`}
                </output>
              </div>
              {(
                [
                  ["lineage", "Linhagem"],
                  ["aspectLegacy", "Legado do Aspecto"],
                  ["corruption", "Corrupção"],
                ] as const
              ).map(([name, label]) => (
                <Field
                  key={name}
                  form={form}
                  name={name}
                  label={label}
                  type={name === "corruption" ? "number" : "text"}
                />
              ))}
              <RankSelect
                form={form}
                name="aspectRank"
                label="Rank do Aspecto"
                options={rankOptions}
                allowEmpty
              />
              <RankSelect
                form={form}
                name="soulRank"
                label="Rank da alma"
                options={rankOptions}
              />
            </Grid>
          </Section>
          <CharacterSkillsEditor characterId={activeId} />
        </TabsContent>
        <TabsContent value="supernatural">
          <div className="grid gap-6 xl:grid-cols-2">
            <Section
              title="Aspecto"
              description="Poder central e sua mecânica."
            >
              <Field form={form} name="aspectName" label="Nome do Aspecto" />
              <LongField
                form={form}
                name="aspectDescription"
                label="Descrição"
              />
              <LongField
                form={form}
                name="aspectMechanic"
                label="Efeito mecânico"
              />
            </Section>
            <Section
              title="Defeito"
              description="Consequência inseparável do Aspecto."
            >
              <Field form={form} name="flawName" label="Nome do Defeito" />
              <LongField
                form={form}
                name="flawDescription"
                label="Descrição narrativa"
              />
              <LongField
                form={form}
                name="flawMechanic"
                label="Efeito mecânico"
              />
            </Section>
            <Section
              title="Nome Verdadeiro"
              description="Significado, origem e efeito."
            >
              <LongField
                form={form}
                name="trueNameMeaning"
                label="Significado e origem"
              />
              <LongField
                form={form}
                name="trueNameEffect"
                label="Efeito e consequências"
              />
            </Section>
          </div>
        </TabsContent>
        <TabsContent value="arsenal">
          <CharacterArsenalEditor characterId={activeId} />
        </TabsContent>
        <TabsContent value="notes">
          <Section title="Notas" description="Anotações do player sobre a ficha e a aventura.">
            {activeId ? <CharacterNotesBoard characterId={activeId} userId={user?.id ?? ""} /> : <p className="text-sm text-amber-300/80">Salve a ficha antes de criar notas avulsas.</p>}
          </Section>
        </TabsContent>
      </Tabs>
    </form>
  );
}
function stat(
  character_id: string,
  stat_key: string,
  label: string,
  category: string,
  max_value: number | null,
  current_value: number | null,
  base_value = 0,
  temporary_bonus = 0,
) {
  return {
    character_id,
    stat_key,
    label,
    category,
    base_value,
    temporary_bonus,
    penalty: 0,
    current_value,
    max_value,
    notes: null,
  };
}
function SaveIndicator({ state }: { state: SaveState }) {
  const content = {
    idle: [Cloud, "Aguardando"],
    saving: [CloudUpload, "Salvando"],
    saved: [Check, "Salvo"],
    error: [AlertCircle, "Revise os campos"],
  } as const;
  const [Icon, label] = content[state];
  return (
    <span
      role="status"
      className={`flex items-center gap-2 text-sm ${state === "error" ? "text-rose-300" : "text-zinc-500"}`}
    >
      <Icon size={16} className={state === "saving" ? "animate-pulse" : ""} />
      {label}
    </span>
  );
}
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grim-card rounded-2xl p-5 sm:p-6">
      <div className="mb-6">
        <h2 className="font-serif text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
type FormApi = ReturnType<typeof useForm<FormValues>>;
type Path = Parameters<FormApi["register"]>[0];

function CombatStatus({ form }: { form: FormApi }) {
  const currentHp = Number(form.watch("currentHp")) || 0;
  const maxHp = Number(form.watch("maxHp")) || 0;
  const hpPercent = maxHp > 0 ? Math.min(100, Math.max(0, (currentHp / maxHp) * 100)) : 0;

  function adjustHp(amount: number) {
    form.setValue("currentHp", Math.min(Math.max(0, maxHp), Math.max(0, currentHp + amount)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-950/45 via-black/20 to-black/10 shadow-[0_0_30px_rgba(244,63,94,.08)]">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-rose-300/20 bg-rose-500/15 text-rose-300">
              <HeartPulse aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-rose-300/80">Vitalidade</p>
              <p className="mt-0.5 text-sm text-zinc-500">Pontos de vida do personagem</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Button type="button" size="icon" variant="ghost" className="text-rose-200 hover:bg-rose-500/15 hover:text-white" onClick={() => adjustHp(-1)} aria-label="Diminuir HP em 1">
              <Minus />
            </Button>
            <strong className="min-w-24 text-center text-2xl tabular-nums text-white">
              {currentHp}<span className="text-base font-normal text-rose-200/60"> / {maxHp}</span>
            </strong>
            <Button type="button" size="icon" variant="ghost" className="text-rose-200 hover:bg-rose-500/15 hover:text-white" onClick={() => adjustHp(1)} aria-label="Aumentar HP em 1">
              <Plus />
            </Button>
          </div>
        </div>
        <div className="relative h-3 overflow-hidden border-y border-white/[.05] bg-black/35" role="progressbar" aria-label="HP atual" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={currentHp}>
          <div className="h-full bg-gradient-to-r from-red-700 via-rose-600 to-red-400 shadow-[0_0_18px_rgba(244,63,94,.55)] transition-[width] duration-300" style={{ width: `${hpPercent}%` }} />
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <CombatInput form={form} name="currentHp" label="HP atual" tone="rose" />
          <CombatInput form={form} name="maxHp" label="HP máximo" tone="rose" />
          <CombatInput form={form} name="tempHp" label="HP temporário" tone="amber" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CombatMetric form={form} name="armorClass" label="CA" description="Classe de Armadura" icon={Shield} tone="blue" />
        <CombatMetric form={form} name="magicResistance" label="MR" description="Resistência Mágica" icon={ShieldCheck} tone="violet" />
        <CombatMetric form={form} name="movement" label="Deslocamento" description="Movimento por turno" icon={Footprints} tone="emerald" />
        <CombatMetric form={form} name="initiative" label="Iniciativa" description="Ordem de combate" icon={Activity} tone="amber" />
      </div>
    </div>
  );
}

const combatTones = {
  rose: "border-rose-400/20 bg-rose-500/[.07] text-rose-300 focus-within:border-rose-400/45",
  amber: "border-amber-400/20 bg-amber-500/[.07] text-amber-300 focus-within:border-amber-400/45",
  blue: "border-sky-400/20 bg-sky-500/[.07] text-sky-300 focus-within:border-sky-400/45",
  violet: "border-violet-400/20 bg-violet-500/[.07] text-violet-300 focus-within:border-violet-400/45",
  emerald: "border-emerald-400/20 bg-emerald-500/[.07] text-emerald-300 focus-within:border-emerald-400/45",
} as const;

function CombatInput({ form, name, label, tone }: { form: FormApi; name: "currentHp" | "maxHp" | "tempHp"; label: string; tone: keyof typeof combatTones }) {
  return (
    <label className={`rounded-xl border p-3 transition-colors ${combatTones[tone]}`}>
      <span className="block text-xs font-semibold uppercase tracking-wider">{label}</span>
      <Input type="number" min={0} className="mt-2 h-auto border-0 bg-transparent p-0 text-xl font-bold tabular-nums text-white shadow-none focus-visible:ring-0" {...form.register(name)} />
    </label>
  );
}

function CombatMetric({ form, name, label, description, icon: Icon, tone }: { form: FormApi; name: "armorClass" | "magicResistance" | "movement" | "initiative"; label: string; description: string; icon: typeof Shield; tone: keyof typeof combatTones }) {
  return (
    <label className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:brightness-110 ${combatTones[tone]}`}>
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-xs font-bold uppercase tracking-[.16em]">{label}</span>
          <span className="mt-1 block text-xs text-zinc-500">{description}</span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-current/10">
          <Icon aria-hidden="true" size={18} />
        </span>
      </span>
      <Input type="number" className="mt-5 h-auto border-0 bg-transparent p-0 text-3xl font-bold tabular-nums text-white shadow-none focus-visible:ring-0" {...form.register(name)} />
    </label>
  );
}

function Field({
  form,
  name,
  label,
  type = "text",
}: {
  form: FormApi;
  name: Path;
  label: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        className="border-white/10 bg-black/20"
        {...form.register(name)}
      />
    </div>
  );
}
function RankSelect({
  form,
  name,
  label,
  options,
  allowEmpty = false,
}: {
  form: FormApi;
  name: "rankName" | "aspectRank" | "soulRank" | "className";
  label: string;
  options: string[];
  allowEmpty?: boolean;
}) {
  const currentValue = form.watch(name);
  const visibleOptions = Array.from(
    new Set(currentValue ? [...options, currentValue] : options),
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Select
        value={currentValue || (allowEmpty ? "__none__" : undefined)}
        onValueChange={(value) =>
          form.setValue(name, value === "__none__" ? "" : value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      >
        <SelectTrigger
          id={name}
          className="w-full border-white/10 bg-black/20"
          aria-label={label}
        >
          <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="__none__">Sem rank</SelectItem>}
          {visibleOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SoulCoreSelect({ form }: { form: FormApi }) {
  const currentValue = String(form.watch("soulCores"));

  return (
    <div className="space-y-2">
      <Label htmlFor="soulCores">Núcleos da alma</Label>
      <Select
        value={currentValue}
        onValueChange={(value) => {
          const cores = Number(value);
          form.setValue("soulCores", cores, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue("maxSoulCores", 7, { shouldValidate: true });
          form.setValue("nextCoreFragments", cores * 1000, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      >
        <SelectTrigger
          id="soulCores"
          className="w-full border-white/10 bg-black/20"
          aria-label="Núcleos da alma"
        >
          <SelectValue placeholder="Selecione a quantidade" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 7 }, (_, index) => index + 1).map((cores) => (
            <SelectItem key={cores} value={String(cores)}>
              {cores} {cores === 1 ? "núcleo" : "núcleos"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function LongField({
  form,
  name,
  label,
}: {
  form: FormApi;
  name: Path;
  label: string;
}) {
  return (
    <div className="mb-4 space-y-2 last:mb-0">
      <Label htmlFor={name}>{label}</Label>
      <ColoredTextarea
        id={name}
        value={String(form.watch(name) ?? "")}
        onChange={(value) => form.setValue(name, value as never, { shouldDirty: true, shouldValidate: true })}
      />
    </div>
  );
}
