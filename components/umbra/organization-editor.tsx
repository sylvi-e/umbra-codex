"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, LoaderCircle } from "lucide-react";
import {
  ColoredInput,
  ColoredTextarea,
  ColoredText,
} from "@/components/umbra/colored-text";
import {
  CharacterPortraitEditor,
  CharacterPortraitCard,
} from "@/components/umbra/character-portrait";
import { OrganizationCombat } from "@/components/umbra/organization-combat";
import {
  CharacterNotesBoard,
  CharacterNotesBoardView,
  type BoardNote,
} from "@/components/umbra/character-notes";
const ReadOnlyContext = createContext(false);
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeading } from "@/components/umbra/page-heading";
import { useAuth } from "@/components/umbra/auth-provider";
import { createClient } from "@/lib/supabase/client";
import {
  organizationAttributes,
  organizationDefaults,
  organizationTotals,
  type OrganizationSheet,
} from "@/lib/organization-rules";

export function OrganizationEditor({
  characterId,
  campaignId,
  kind = "player",
  readOnly = false,
}: {
  characterId?: string;
  campaignId?: string;
  kind?: "player" | "npc";
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const [id, setId] = useState(characterId);
  const [campaign, setCampaign] = useState(campaignId);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sheet, setSheet] = useState<OrganizationSheet>(() =>
    structuredClone(organizationDefaults),
  );
  const [loading, setLoading] = useState(Boolean(characterId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const basePath = kind === "npc" ? "/npcs" : "/fichas";
  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    void createClient()!
      .from("character_sheets")
      .select(
        "name,age,portrait_url,organization_data,campaign_id,character_stats(stat_key,current_value,temporary_bonus)",
      )
      .eq("id", characterId)
      .single()
      .then(
        ({
          data,
          error,
        }: {
          data: {
            name: string;
            age: number | null;
            portrait_url: string | null;
            character_stats: {
              stat_key: string;
              current_value: number | null;
              temporary_bonus: number;
            }[];
            campaign_id: string;
            organization_data: Partial<OrganizationSheet>;
          } | null;
          error: unknown;
        }) => {
          if (cancelled) return;
          if (error || !data) setError("Não foi possível abrir a ficha.");
          else {
            setName(data.name);
            setAge(data.age?.toString() ?? "");
            setCampaign(data.campaign_id);
            setSheet({
              ...structuredClone(organizationDefaults),
              ...data.organization_data,
              portraitUrl:
                data.portrait_url ?? data.organization_data.portraitUrl ?? "",
              hp:
                data.character_stats?.find((s) => s.stat_key === "hp")
                  ?.current_value ??
                data.organization_data.hp ??
                10,
              mana:
                data.character_stats?.find((s) => s.stat_key === "essence")
                  ?.current_value ??
                data.organization_data.mana ??
                10,
              tempHp:
                data.character_stats?.find((s) => s.stat_key === "hp")
                  ?.temporary_bonus ??
                data.organization_data.tempHp ??
                0,
            });
          }
          setLoading(false);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [characterId]);
  function update<K extends keyof OrganizationSheet>(
    key: K,
    value: OrganizationSheet[K],
  ) {
    setSheet((current) => ({ ...current, [key]: value }));
  }
  const totals = organizationTotals(
    sheet.attributes,
    sheet.hpBase,
    sheet.manaBase,
    sheet.movementBase,
    sheet.backpackSlots,
  );
  const used = sheet.items.reduce(
    (sum, item) =>
      sum +
      (["carregado", "mochila", "cinto"].includes(item.location)
        ? item.slots
        : 0),
    0,
  );
  async function save() {
    if (!user || saving) return;
    if (name.trim().length < 2 || name.trim().length > 120) {
      toast.error("Informe um nome entre 2 e 120 caracteres.");
      return;
    }
    if (sheet.hp > totals.hp || sheet.mana > totals.mana) {
      toast.error(
        "HP ou Mana atual acima do máximo. Ajuste o valor atual ou a base.",
      );
      return;
    }
    if (!campaign) {
      toast.error("Selecione uma campanha.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await createClient()!.rpc(
        "save_organization_character",
        {
          target_id: id ?? null,
          target_campaign: campaign,
          character_name: name.trim(),
          character_age: age ? Number(age) : null,
          npc: kind === "npc",
          payload: sheet,
        },
      );
      if (error) throw error;
      setId(String(data));
      window.history.replaceState(
        null,
        "",
        `${basePath}/${String(data)}/editar`,
      );
      toast.success("Ficha salva");
    } catch (reason) {
      toast.error(
        (reason as { message?: string }).message ?? "Falha ao salvar",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <p>Abrindo ficha…</p>;
  if (error) return <p role="alert">{error}</p>;
  return (
    <>
      <PageHeading
        eyebrow="A Organização"
        title={name || "Novo personagem"}
        description={
          readOnly
            ? "Ficha de personagem"
            : "Salve suas alterações pelo botão Salvar ficha."
        }
        action={
          readOnly ? (
            <Button asChild>
              <Link href={`${basePath}/${id}/editar`}>Editar ficha</Link>
            </Button>
          ) : (
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {saving ? "Salvando…" : "Salvar ficha"}
            </Button>
          )
        }
      />
      {campaign && (
        <Link
          className="mb-4 inline-block text-violet-300 underline"
          href={`/campanhas/${campaign}`}
        >
          Voltar à campanha
        </Link>
      )}
      <ReadOnlyContext.Provider value={readOnly}>
        <fieldset disabled={saving} className="min-w-0">
          <Tabs defaultValue="summary" className="gap-3">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-white/[.035] p-1 sm:w-fit">
              {[
                ["summary", "Identidade"],
                ["combat", "Combate"],
                ["progression", "Progressão"],
                ["attributes", "Atributos"],
                ["inventory", "Inventário"],
                ["abilities", "Habilidades"],
                ["weapon", "Arma"],
                ["notes", "Notas"],
              ].map(([key, label]) => (
                <TabsTrigger
                  className="flex-none px-3 sm:px-4"
                  key={key}
                  value={key}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="summary" className={readOnly ? "grid items-start gap-5 lg:grid-cols-[300px_1fr]" : "space-y-5"}>
              {readOnly ? (
                <CharacterPortraitCard
                  imageUrl={sheet.portraitUrl}
                  name={name}
                />
              ) : (
                <CharacterPortraitEditor
                  characterId={id}
                  value={sheet.portraitUrl}
                  onChange={(url) => update("portraitUrl", url)}
                />
              )}
              <SheetSection
                title="Identidade"
                description="Informações públicas e narrativas do personagem."
              >
                <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Text
                    label="Nome do personagem"
                    value={name}
                    onChange={setName}
                  />
                  <NumberField
                    label="Idade"
                    value={age === "" ? "" : Number(age)}
                    onChange={(v) => setAge(String(v))}
                  />
                  <Text
                    label="Altura"
                    value={sheet.height}
                    onChange={(v) => update("height", v)}
                  />
                  <Text
                    label="Raça"
                    value={sheet.race}
                    onChange={(v) => update("race", v)}
                  />
                </div>
              </SheetSection>
            </TabsContent>
            <TabsContent value="combat">
              <SheetSection
                title="Status e combate"
                description="Recursos atuais, defesas e movimentação."
              >
                <OrganizationCombat
                  sheet={sheet}
                  update={update}
                  readOnly={readOnly}
                />
              </SheetSection>
            </TabsContent>
            <TabsContent value="progression">
              <SheetSection
                title="Progressão do agente"
                description="Classe e porcentagem de domínio. Os buffs são descritos nas habilidades."
              >
                <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Text
                    label="Classe"
                    value={sheet.className}
                    onChange={(v) => update("className", v)}
                  />
                  <NumberField
                    label="Porcentagem da classe (50–100%)"
                    value={sheet.percentage}
                    min={50}
                    max={100}
                    onChange={(v) => update("percentage", v)}
                  />
                  <NumberField
                    label="Dinheiro"
                    value={sheet.money}
                    onChange={(v) => update("money", v)}
                  />
                </div>
              </SheetSection>
            </TabsContent>
            <TabsContent
              value="attributes"
              className="grim-card rounded-2xl p-5 space-y-4"
            >
              <div className="mb-6">
                <h2 className="font-serif text-2xl">Atributos base</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Cada 2 pontos de base concedem +1. Base 0 concede +0 neste
                  sistema.
                </p>
              </div>
              <div className="space-y-3">
                {organizationAttributes.map((label, index) => (
                  <AttributeRow
                    key={label}
                    label={label}
                    base={sheet.attributes[index]}
                    onBase={(v) =>
                      update(
                        "attributes",
                        sheet.attributes.map((a, i) => (i === index ? v : a)),
                      )
                    }
                  />
                ))}
                {sheet.customAttributes.map((attribute) => (
                  <div key={attribute.id} className="space-y-3">
                    <AttributeRow
                      label={attribute.label}
                      base={attribute.base}
                      onLabel={(label) =>
                        update(
                          "customAttributes",
                          sheet.customAttributes.map((a) =>
                            a.id === attribute.id ? { ...a, label } : a,
                          ),
                        )
                      }
                      onBase={(base) =>
                        update(
                          "customAttributes",
                          sheet.customAttributes.map((a) =>
                            a.id === attribute.id ? { ...a, base } : a,
                          ),
                        )
                      }
                      onRemove={() =>
                        update(
                          "customAttributes",
                          sheet.customAttributes.filter(
                            (a) => a.id !== attribute.id,
                          ),
                        )
                      }
                    />
                    <LongText
                      label={`Notas de ${attribute.label}`}
                      value={attribute.notes}
                      onChange={(notes) =>
                        update(
                          "customAttributes",
                          sheet.customAttributes.map((a) =>
                            a.id === attribute.id ? { ...a, notes } : a,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 border-white/10"
                  onClick={() =>
                    update("customAttributes", [
                      ...sheet.customAttributes,
                      {
                        id: crypto.randomUUID(),
                        label: "Novo atributo",
                        base: 0,
                        notes: "",
                      },
                    ])
                  }
                >
                  <Plus />
                  Adicionar atributo
                </Button>
              )}
              <p>
                Força: +3 espaços; Destreza: +4 m; Constituição: +10 HP;
                Inteligência: +5 Mana a cada 10 pontos.
              </p>
              <p>
                Percepção: {totals.perception} marco(s) de reação divina.
                Interpessoal: {totals.interpersonal} marco(s) de primeira
                impressão e beleza. Aplicação pelo mestre.
              </p>
            </TabsContent>
            <TabsContent value="inventory" className="space-y-4">
              <div className="grim-card rounded-2xl p-5">
                <NumberField
                  label="Espaços extras da mochila"
                  value={sheet.backpackSlots}
                  onChange={(v) => update("backpackSlots", v)}
                />
                <p
                  className={used > totals.slots ? "mt-3 text-red-300" : "mt-3"}
                >
                  Espaços carregados: {used} / {totals.slots}
                  {used > totals.slots ? " — capacidade excedida" : ""}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Espaços representam o total ocupado pela pilha. Equipados e
                  itens no baú não consomem capacidade. Use 0 para itens
                  pequenos ou isentos.
                </p>
              </div>
              {sheet.items.map((item) => (
                <section
                  key={item.id}
                  className="grim-card rounded-2xl p-5 space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Text
                      label="Item / artefato"
                      value={item.name}
                      onChange={(v) =>
                        update(
                          "items",
                          sheet.items.map((i) =>
                            i.id === item.id ? { ...i, name: v } : i,
                          ),
                        )
                      }
                    />
                    <label className="space-y-2">
                      <span>Localização</span>
                      <select
                        disabled={readOnly}
                        className="h-10 w-full rounded-md border bg-background px-3"
                        value={item.location}
                        onChange={(e) =>
                          update(
                            "items",
                            sheet.items.map((i) =>
                              i.id === item.id
                                ? { ...i, location: e.target.value }
                                : i,
                            ),
                          )
                        }
                      >
                        {[
                          ["carregado", "Carregado"],
                          ["equipado", "Equipado"],
                          ["mochila", "Mochila"],
                          ["cinto", "Cinto de poções"],
                          ["bau", "Baú"],
                        ].map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <NumberField
                      label="Quantidade"
                      min={1}
                      value={item.quantity}
                      onChange={(v) =>
                        update(
                          "items",
                          sheet.items.map((i) =>
                            i.id === item.id ? { ...i, quantity: v } : i,
                          ),
                        )
                      }
                    />
                    <NumberField
                      label="Espaços totais ocupados"
                      value={item.slots}
                      onChange={(v) =>
                        update(
                          "items",
                          sheet.items.map((i) =>
                            i.id === item.id ? { ...i, slots: v } : i,
                          ),
                        )
                      }
                    />
                  </div>
                  {(
                    [
                      ["description", "Descrição"],
                      ["effect", "Efeito / encantamentos"],
                      ["drawback", "Malefício"],
                    ] as const
                  ).map(([key, label]) => (
                    <LongText
                      key={key}
                      label={label}
                      value={item[key]}
                      onChange={(v) =>
                        update(
                          "items",
                          sheet.items.map((i) =>
                            i.id === item.id ? { ...i, [key]: v } : i,
                          ),
                        )
                      }
                    />
                  ))}
                  {!readOnly && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        update(
                          "items",
                          sheet.items.filter((i) => i.id !== item.id),
                        )
                      }
                    >
                      Remover item
                    </Button>
                  )}
                </section>
              ))}
              {!readOnly && (
                <Button
                  onClick={() =>
                    update("items", [
                      ...sheet.items,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        quantity: 1,
                        slots: 1,
                        location: "carregado",
                        description: "",
                        effect: "",
                        drawback: "",
                      },
                    ])
                  }
                >
                  Adicionar item ou artefato
                </Button>
              )}
            </TabsContent>
            <TabsContent value="abilities" className="space-y-4">
              {sheet.abilities.map((ability) => (
                <section
                  key={ability.id}
                  className="grim-card rounded-2xl p-5 space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["name", "Nome"],
                        ["type", "Tipo (ativa / passiva)"],
                        ["origin", "Origem (classe / recompensa / outra)"],
                        ["duration", "Duração"],
                      ] as const
                    ).map(([key, label]) => (
                      <Text
                        key={key}
                        label={label}
                        value={ability[key]}
                        onChange={(v) =>
                          update(
                            "abilities",
                            sheet.abilities.map((a) =>
                              a.id === ability.id ? { ...a, [key]: v } : a,
                            ),
                          )
                        }
                      />
                    ))}
                    <NumberField
                      label="Custo de Mana"
                      value={ability.mana}
                      onChange={(v) =>
                        update(
                          "abilities",
                          sheet.abilities.map((a) =>
                            a.id === ability.id ? { ...a, mana: v } : a,
                          ),
                        )
                      }
                    />
                  </div>
                  <LongText
                    label="Descrição, condições e progressão"
                    value={ability.description}
                    onChange={(v) =>
                      update(
                        "abilities",
                        sheet.abilities.map((a) =>
                          a.id === ability.id ? { ...a, description: v } : a,
                        ),
                      )
                    }
                  />
                  {!readOnly && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        update(
                          "abilities",
                          sheet.abilities.filter((a) => a.id !== ability.id),
                        )
                      }
                    >
                      Remover habilidade
                    </Button>
                  )}
                </section>
              ))}
              {!readOnly && (
                <Button
                  onClick={() =>
                    update("abilities", [
                      ...sheet.abilities,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        type: "Ativa",
                        origin: "Classe",
                        mana: 0,
                        duration: "",
                        description: "",
                      },
                    ])
                  }
                >
                  Adicionar habilidade
                </Button>
              )}
            </TabsContent>
            <TabsContent
              value="weapon"
              className="grim-card rounded-2xl p-5 space-y-4"
            >
              <Text
                label="Arma vinculada"
                value={sheet.weapon}
                onChange={(v) => update("weapon", v)}
              />
              <Text
                label="Dano da arma"
                value={sheet.weaponDamage}
                onChange={(v) => update("weaponDamage", v)}
              />
              <LongText
                label="Encantamentos"
                value={sheet.enchantments}
                onChange={(v) => update("enchantments", v)}
              />
              <LongText
                label="Habilidades iniciais da arma"
                value={sheet.initialWeaponAbilities}
                onChange={(v) => update("initialWeaponAbilities", v)}
              />
            </TabsContent>
            <TabsContent value="notes">
              <SheetSection
                title="Notas"
                description="Anotações do player sobre a ficha e a aventura."
              >
                <LongText
                  label="Notas gerais"
                  value={sheet.notes}
                  onChange={(v) => update("notes", v)}
                />
                {id ? (
                  <OrganizationNotes
                    characterId={id}
                    userId={user?.id ?? ""}
                    readOnly={readOnly}
                  />
                ) : (
                  <p className="text-sm text-amber-300/80">
                    Salve a ficha antes de criar notas avulsas.
                  </p>
                )}
              </SheetSection>
            </TabsContent>
          </Tabs>
        </fieldset>
      </ReadOnlyContext.Provider>
    </>
  );
}
function SheetSection({
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
function AttributeRow({
  label,
  base,
  onBase,
  onLabel,
  onRemove,
}: {
  label: string;
  base: number;
  onBase: (v: number) => void;
  onLabel?: (v: string) => void;
  onRemove?: () => void;
}) {
  const readOnly = useContext(ReadOnlyContext);
  const bonus = Math.floor(base / 2);
  const formatted = bonus >= 0 ? `+${bonus}` : String(bonus);
  return (
    <div className="grid gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-4 md:grid-cols-[1.2fr_repeat(3,.7fr)_auto]">
      {onLabel ? (
        <Text label="Atributo" value={label} onChange={onLabel} />
      ) : (
        <div className="space-y-2">
          <span className="text-sm">Atributo</span>
          <output className="block rounded-md border border-white/10 bg-black/20 px-3 py-2">
            {label}
          </output>
        </div>
      )}
      <NumberField
        label="Base"
        value={base}
        onChange={(v) => onBase(Math.floor(v))}
      />
      <div>
        <span className="text-sm">Bônus</span>
        <output className="mt-2 block h-10 rounded-md border border-violet-400/20 bg-violet-500/[.07] px-3 py-2 font-semibold text-violet-200">
          {formatted}
        </output>
      </div>
      <div>
        <span className="text-sm">Final</span>
        <output className="mt-2 block h-10 rounded-md border border-white/10 bg-black/20 px-3 py-2 font-semibold">
          {formatted}
        </output>
      </div>
      {onRemove && !readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-7"
          onClick={onRemove}
          aria-label={`Remover atributo ${label}`}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const readOnly = useContext(ReadOnlyContext);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      {readOnly ? (
        <ColoredText
          text={value || "—"}
          className="block rounded-md border border-white/10 bg-black/20 px-3 py-2"
        />
      ) : (
        <ColoredInput id={id} value={value} onChange={onChange} />
      )}
    </div>
  );
}
function LongText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const readOnly = useContext(ReadOnlyContext);
  return (
    <div className="mb-4 space-y-2 last:mb-0">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      {readOnly ? (
        <ColoredText
          text={value || "—"}
          className="block rounded-xl border border-white/[.06] bg-white/[.02] p-4"
        />
      ) : (
        <ColoredTextarea id={id} value={value} onChange={onChange} />
      )}
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  value: number | "";
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const readOnly = useContext(ReadOnlyContext);
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>
      <Input
        disabled={readOnly}
        type="number"
        className="border-white/10 bg-black/20"
        min={min}
        max={max}
        step="any"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v))
            onChange(Math.min(max ?? Infinity, Math.max(min, v)));
        }}
      />
    </label>
  );
}

function OrganizationNotes({
  characterId,
  userId,
  readOnly,
}: {
  characterId: string;
  userId: string;
  readOnly: boolean;
}) {
  const [notes, setNotes] = useState<BoardNote[]>([]);
  useEffect(() => {
    if (!readOnly) return;
    let cancelled = false;
    void createClient()!
      .from("character_notes")
      .select(
        "id,title,content,board_x,board_y,board_width,board_height,z_index,is_pinned",
      )
      .eq("character_id", characterId)
      .eq("note_type", "player")
      .eq("is_pinned", true)
      .order("z_index")
      .then(({ data, error }: { data: BoardNote[] | null; error: unknown }) => {
        if (cancelled) return;
        if (error) toast.error("Não foi possível carregar as notas");
        else setNotes(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [characterId, readOnly]);
  return readOnly ? (
    <CharacterNotesBoardView notes={notes} />
  ) : (
    <CharacterNotesBoard characterId={characterId} userId={userId} />
  );
}
