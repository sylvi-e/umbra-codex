"use client";
import {
  HeartPulse,
  Minus,
  Plus,
  Shield,
  ShieldCheck,
  Footprints,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrganizationSheet } from "@/lib/organization-rules";
import { organizationTotals } from "@/lib/organization-rules";
type Props = {
  readOnly?: boolean;
  sheet: OrganizationSheet;
  update: <K extends keyof OrganizationSheet>(
    key: K,
    value: OrganizationSheet[K],
  ) => void;
};
export function OrganizationCombat({ sheet, update, readOnly = false }: Props) {
  const totals = organizationTotals(
    sheet.attributes,
    sheet.hpBase,
    sheet.manaBase,
    sheet.movementBase,
    sheet.backpackSlots,
  );
  const currentHp = sheet.hp,
    maxHp = totals.hp,
    temporaryHp = sheet.tempHp;
  const displayMax = Math.max(maxHp, currentHp + temporaryHp, 1);
  const hpPercent = Math.min(100, Math.max(0, (currentHp / displayMax) * 100));
  const temporaryHpPercent = Math.min(
    100 - hpPercent,
    (temporaryHp / displayMax) * 100,
  );
  function adjustHp(amount: number) {
    update("hp", Math.min(maxHp, Math.max(0, currentHp + amount)));
  }
  function adjustTemporaryHp(amount: number) {
    update("tempHp", Math.max(0, temporaryHp + amount));
  }
  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      <div className="overflow-hidden rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-950/45 via-black/20 to-black/10 shadow-[0_0_30px_rgba(244,63,94,.08)]">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-rose-300/20 bg-rose-500/15 text-rose-300">
              <HeartPulse aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-rose-300/80">
                Vitalidade
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                Pontos de vida do personagem
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-rose-200 hover:bg-rose-500/15 hover:text-white"
              onClick={() => adjustHp(-1)}
              aria-label="Diminuir HP em 1"
            >
              <Minus />
            </Button>
            <strong className="min-w-24 text-center text-2xl tabular-nums text-white">
              {currentHp}
              <span className="text-base font-normal text-rose-200/60">
                {" "}
                / {maxHp}
              </span>
            </strong>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-rose-200 hover:bg-rose-500/15 hover:text-white"
              onClick={() => adjustHp(1)}
              aria-label="Aumentar HP em 1"
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div
          className="relative flex h-3 overflow-hidden border-y border-white/[.05] bg-black/35"
          role="progressbar"
          aria-label={`HP atual: ${currentHp} de ${maxHp}. HP temporário: ${temporaryHp}.`}
          aria-valuemin={0}
          aria-valuemax={displayMax}
          aria-valuenow={Math.min(displayMax, currentHp + temporaryHp)}
        >
          <div
            className="h-full bg-gradient-to-r from-red-700 via-red-600 to-red-400 shadow-[0_0_18px_rgba(239,68,68,.55)] transition-[width] duration-300"
            style={{ width: `${hpPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_14px_rgba(250,204,21,.45)] transition-[width] duration-300"
            style={{ width: `${temporaryHpPercent}%` }}
          />
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <ResourceInput
            label="HP atual"
            value={sheet.hp}
            onChange={(v) => update("hp", v)}
          />
          <ResourceInput
            label={`HP máximo base (total: ${totals.hp})`}
            value={sheet.hpBase}
            onChange={(v) => update("hpBase", v)}
          />
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/[.07] p-3 text-amber-300">
            <span className="block text-xs font-semibold uppercase tracking-wider">
              HP temporário
            </span>
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => adjustTemporaryHp(-1)}
                disabled={temporaryHp <= 0}
                aria-label="Diminuir HP temporário em 1"
                className="text-amber-200 hover:bg-amber-500/15 hover:text-white"
              >
                <Minus />
              </Button>
              <Input
                type="number"
                min={0}
                aria-label="HP temporário"
                className="h-auto min-w-0 border-0 bg-transparent p-0 text-center text-xl font-bold tabular-nums text-white shadow-none focus-visible:ring-0"
                value={sheet.tempHp}
                onChange={(e) =>
                  update("tempHp", Math.max(0, Number(e.target.value) || 0))
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => adjustTemporaryHp(1)}
                aria-label="Aumentar HP temporário em 1"
                className="text-amber-200 hover:bg-amber-500/15 hover:text-white"
              >
                <Plus />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/45 via-black/20 to-black/10 shadow-[0_0_30px_rgba(139,92,246,.08)]">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-violet-300/20 bg-violet-500/15 text-violet-300">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300/80">
                Mana
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                Energia para habilidades
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Diminuir Mana em 1"
              onClick={() => update("mana", Math.max(0, sheet.mana - 1))}
            >
              <Minus />
            </Button>
            <strong className="min-w-24 text-center text-2xl tabular-nums">
              {sheet.mana}
              <span className="text-base font-normal text-violet-200/60">
                {" "}
                / {totals.mana}
              </span>
            </strong>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Aumentar Mana em 1"
              onClick={() =>
                update("mana", Math.min(totals.mana, sheet.mana + 1))
              }
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Mana atual"
          aria-valuemin={0}
          aria-valuemax={Math.max(totals.mana, 1)}
          aria-valuenow={Math.min(sheet.mana, Math.max(totals.mana, 1))}
          className="h-3 overflow-hidden border-y border-white/[.05] bg-black/35"
        >
          <div
            className="h-full bg-gradient-to-r from-violet-700 via-violet-500 to-fuchsia-400 shadow-[0_0_18px_rgba(139,92,246,.55)] transition-[width] duration-300"
            style={{
              width: `${Math.min(100, (sheet.mana / Math.max(totals.mana, 1)) * 100)}%`,
            }}
          />
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <ResourceInput
            label="Mana atual"
            value={sheet.mana}
            onChange={(v) => update("mana", v)}
            tone="violet"
          />
          <ResourceInput
            label={`Mana máxima base (total: ${totals.mana})`}
            value={sheet.manaBase}
            onChange={(v) => update("manaBase", v)}
            tone="violet"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="CA"
          description="Redução de dano físico"
          icon={Shield}
          tone="border-sky-400/20 bg-sky-500/[.07] text-sky-300"
          total={sheet.armor + sheet.armorBonus}
        >
          <ResourceInput
            label="Base"
            value={sheet.armor}
            onChange={(v) => update("armor", v)}
          />
          <ResourceInput
            label="Equipamentos"
            value={sheet.armorBonus}
            onChange={(v) => update("armorBonus", v)}
          />
        </Metric>
        <Metric
          label="MR"
          description="Redução de dano mágico"
          icon={ShieldCheck}
          tone="border-violet-400/20 bg-violet-500/[.07] text-violet-300"
          total={sheet.mr + sheet.mrBonus}
        >
          <ResourceInput
            label="Base"
            value={sheet.mr}
            onChange={(v) => update("mr", v)}
          />
          <ResourceInput
            label="Equipamentos"
            value={sheet.mrBonus}
            onChange={(v) => update("mrBonus", v)}
          />
        </Metric>
        <Metric
          label="Deslocamento"
          description="Movimento por turno"
          icon={Footprints}
          tone="border-emerald-400/20 bg-emerald-500/[.07] text-emerald-300"
          total={totals.movement}
        >
          <ResourceInput
            label="Base em metros"
            value={sheet.movementBase}
            onChange={(v) => update("movementBase", v)}
          />
        </Metric>
      </div>
    </fieldset>
  );
}
function ResourceInput({
  label,
  value,
  onChange,
  tone = "rose",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone?: "rose" | "violet";
}) {
  return (
    <label
      className={`block rounded-xl border p-3 transition-colors ${tone === "rose" ? "border-rose-400/20 bg-rose-500/[.07] text-rose-300" : "border-violet-400/20 bg-violet-500/[.07] text-violet-300"}`}
    >
      <span className="block text-xs font-semibold uppercase tracking-wider">
        {label}
      </span>
      <Input
        aria-label={label}
        type="number"
        min={0}
        className="mt-2 h-auto border-0 bg-transparent p-0 text-xl font-bold tabular-nums text-white shadow-none focus-visible:ring-0"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </label>
  );
}
function Metric({
  label,
  description,
  icon: Icon,
  tone,
  total,
  children,
}: {
  label: string;
  description: string;
  icon: typeof Shield;
  tone: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:brightness-110 ${tone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em]">
            {label}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>
        <Icon size={18} />
      </div>
      <output className="my-4 block text-3xl font-bold tabular-nums text-white">
        {total}
      </output>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
