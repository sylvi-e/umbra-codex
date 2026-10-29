"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      .select("name,age,organization_data,campaign_id")
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
      <fieldset disabled={readOnly || saving} className="min-w-0">
        <Tabs defaultValue="summary">
          <TabsList className="h-auto flex-wrap">
            {[
              ["summary", "Resumo"],
              ["attributes", "Atributos"],
              ["inventory", "Inventário"],
              ["abilities", "Habilidades"],
              ["weapon", "Arma"],
            ].map(([key, label]) => (
              <TabsTrigger key={key} value={key}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value="summary"
            className="grim-card rounded-2xl p-5 space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Text label="Nome" value={name} onChange={setName} />
              <NumberField
                label="Idade"
                value={age === "" ? "" : Number(age)}
                onChange={(v) => setAge(String(v))}
              />
              <Text
                label="Raça"
                value={sheet.race}
                onChange={(v) => update("race", v)}
              />
              <Text
                label="Altura"
                value={sheet.height}
                onChange={(v) => update("height", v)}
              />
              <Text
                label="Classe"
                value={sheet.className}
                onChange={(v) => update("className", v)}
              />
              <NumberField
                label="Porcentagem da classe (50–100%)"
                min={50}
                max={100}
                value={sheet.percentage}
                onChange={(v) => update("percentage", v)}
              />
              <NumberField
                label={`HP atual / ${totals.hp}`}
                value={sheet.hp}
                onChange={(v) => update("hp", v)}
              />
              <NumberField
                label="HP máximo base"
                value={sheet.hpBase}
                onChange={(v) => update("hpBase", v)}
              />
              <NumberField
                label={`Mana atual / ${totals.mana}`}
                value={sheet.mana}
                onChange={(v) => update("mana", v)}
              />
              <NumberField
                label="Mana máxima base"
                value={sheet.manaBase}
                onChange={(v) => update("manaBase", v)}
              />
              <NumberField
                label={`Deslocamento base (total: ${totals.movement} m)`}
                value={sheet.movementBase}
                onChange={(v) => update("movementBase", v)}
              />
              <NumberField
                label="Dinheiro"
                value={sheet.money}
                onChange={(v) => update("money", v)}
              />
              <NumberField
                label={`CA base (total: ${sheet.armor + sheet.armorBonus})`}
                value={sheet.armor}
                onChange={(v) => update("armor", v)}
              />
              <NumberField
                label="Bônus de CA dos equipamentos"
                value={sheet.armorBonus}
                onChange={(v) => update("armorBonus", v)}
              />
              <NumberField
                label={`MR base (total: ${sheet.mr + sheet.mrBonus})`}
                value={sheet.mr}
                onChange={(v) => update("mr", v)}
              />
              <NumberField
                label="Bônus de MR dos equipamentos"
                value={sheet.mrBonus}
                onChange={(v) => update("mrBonus", v)}
              />
            </div>
            <p className="text-sm text-zinc-400">
              CA reduz dano físico; MR reduz dano mágico. Os bônus por atributos
              são somados aos valores base. A porcentagem da classe é apenas
              registrada, sem buffs automáticos.
            </p>
            <LongText
              label="Notas"
              value={sheet.notes}
              onChange={(v) => update("notes", v)}
            />
          </TabsContent>
          <TabsContent
            value="attributes"
            className="grim-card rounded-2xl p-5 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organizationAttributes.map((label, index) => (
                <NumberField
                  key={label}
                  label={`${label} (${Math.floor(sheet.attributes[index] / 2) >= 0 ? "+" : ""}${Math.floor(sheet.attributes[index] / 2)})`}
                  value={sheet.attributes[index]}
                  onChange={(v) =>
                    update(
                      "attributes",
                      sheet.attributes.map((a, i) =>
                        i === index ? Math.floor(v) : a,
                      ),
                    )
                  }
                />
              ))}
            </div>
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
              <p className={used > totals.slots ? "mt-3 text-red-300" : "mt-3"}>
                Espaços carregados: {used} / {totals.slots}
                {used > totals.slots ? " — capacidade excedida" : ""}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Espaços representam o total ocupado pela pilha. Equipados e
                itens no baú não consomem capacidade. Use 0 para itens pequenos
                ou isentos.
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
        </Tabs>
      </fieldset>
    </>
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
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
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
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>
      <Textarea
        className="min-h-28"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
  return (
    <label className="block space-y-2">
      <span className="text-sm">{label}</span>
      <Input
        type="number"
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
