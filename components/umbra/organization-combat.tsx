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
import type {
  OrganizationSheet,
  OrganizationCombatKey,
} from "@/lib/organization-rules";
import { organizationTotals } from "@/lib/organization-rules";
type Props = {
  readOnly?: boolean;
  sheet: OrganizationSheet;
  update: (key: OrganizationCombatKey, value: number) => void;
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
  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-950/45 via-black/20 to-black/10">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-rose-300/20 bg-rose-500/15 text-rose-300">
              <HeartPulse aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-rose-300/80">
                Vitalidade
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-0 overflow-hidden rounded-xl border border-current/20 bg-black/20">
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
          className="relative mx-5 flex h-2 overflow-hidden rounded-full bg-black/35"
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
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">

          <ResourceInput
            label="HP máximo"
            hint={`Base · total com atributos: ${totals.hp}`}
            value={sheet.hpBase}
            onChange={(v) => update("hpBase", v)}
          />
          <ResourceInput label="HP temporário" tone="amber" value={sheet.tempHp} onChange={(v) => update("tempHp", v)} />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/45 via-black/20 to-black/10">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-violet-300/20 bg-violet-500/15 text-violet-300">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300/80">
                Mana
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-0 overflow-hidden rounded-xl border border-current/20 bg-black/20">
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
          className="mx-5 h-2 overflow-hidden rounded-full bg-black/35"
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
            label="Mana máxima"
            hint={`Base · total com atributos: ${totals.mana}`}
            value={sheet.manaBase}
            onChange={(v) => update("manaBase", v)}
            tone="violet"
          />
        </div>
      </div>
      </div>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.16em] text-zinc-400">Defesas e mobilidade<span aria-hidden="true" className="h-px flex-1 bg-white/10" /></div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.72fr]">
        <Metric
          label="CA"
          description="Redução de dano físico"
          icon={Shield}
          tone="border-sky-400/20 bg-sky-500/[.07] text-sky-300"
          total={sheet.armor + sheet.armorBonus}
        >
          <ResourceInput
            label="Base" accessibleLabel="CA base" allowNegative
            tone="blue"
            value={sheet.armor}
            onChange={(v) => update("armor", v)}
          />
          <ResourceInput
            label="Equipamentos" accessibleLabel="CA dos equipamentos" allowNegative
            tone="blue"
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
            label="Base" accessibleLabel="MR base" allowNegative
            tone="violet"
            value={sheet.mr}
            onChange={(v) => update("mr", v)}
          />
          <ResourceInput
            label="Equipamentos" accessibleLabel="MR dos equipamentos" allowNegative
            tone="violet"
            value={sheet.mrBonus}
            onChange={(v) => update("mrBonus", v)}
          />
        </Metric>
        <Metric
          label="Deslocamento"
          description="m / turno"
          icon={Footprints}
          tone="border-emerald-400/20 bg-emerald-500/[.07] text-emerald-300"
          onAdjust={(delta) =>
            update("movementBase", Math.max(0, sheet.movementBase + delta))
          }
          total={totals.movement}
        >

        </Metric>
      </div>
    </fieldset>
  );
}
function ResourceInput({ label, accessibleLabel, value, onChange, tone = "rose", hint, allowNegative = false }: {
  label: string;
  accessibleLabel?: string;
  value: number;
  onChange: (v: number) => void;
  tone?: "rose" | "violet" | "blue" | "amber";
  hint?: string;
  allowNegative?: boolean;
}) {
  const name = accessibleLabel ?? label;
  return (
    <div className="min-w-0">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${{ rose: "text-rose-300", violet: "text-violet-300", blue: "text-sky-300", amber: "text-amber-300" }[tone]}`}>
        <span className="text-sm">{label}</span>
        <div className="inline-flex shrink-0 items-center overflow-hidden rounded-xl border border-current/20 bg-black/20">
          <Button type="button" variant="ghost" size="icon" className="rounded-none text-inherit hover:bg-white/10 hover:text-white" aria-label={`Diminuir ${name} em 1`} disabled={!allowNegative && value <= 0} onClick={() => onChange(allowNegative ? value - 1 : Math.max(0, value - 1))}><Minus /></Button>
          <Input aria-label={name} type="number" min={allowNegative ? undefined : 0} className="h-9 w-16 rounded-none border-0 bg-transparent px-1 text-center font-bold tabular-nums text-white shadow-none [appearance:textfield] focus-visible:ring-inset [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" value={value} onChange={(e) => onChange(allowNegative ? Number(e.target.value) || 0 : Math.max(0, Number(e.target.value) || 0))} />
          <Button type="button" variant="ghost" size="icon" className="rounded-none text-inherit hover:bg-white/10 hover:text-white" aria-label={`Aumentar ${name} em 1`} onClick={() => onChange(value + 1)}><Plus /></Button>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
function Metric({ label, description, icon: Icon, tone, total, onAdjust, children }: {
  label: string;
  description: string;
  icon: typeof Shield;
  tone: string;
  total: number;
  onAdjust?: (delta: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <section aria-label={label} className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><Icon aria-hidden="true" size={20} /><h3 className="text-xs font-bold uppercase tracking-[.14em]">{label}</h3></div>
          {!onAdjust && <p className="mt-2 text-xs text-zinc-400">{description}</p>}
        </div>
        {!onAdjust && <output aria-label={`Total ${label}`} className="text-3xl font-bold tabular-nums text-white">{total}</output>}
      </div>
      {onAdjust ? <div className="mt-6 flex flex-col items-center gap-2"><div className="inline-flex items-center overflow-hidden rounded-xl border border-current/20 bg-black/20">
        <Button type="button" size="icon" variant="ghost" className="rounded-none text-inherit" aria-label={`Diminuir ${label} em 1`} onClick={() => onAdjust(-1)}><Minus /></Button>
        <output className="min-w-16 text-center text-3xl font-bold tabular-nums text-white">{total}</output>
        <Button type="button" size="icon" variant="ghost" className="rounded-none text-inherit" aria-label={`Aumentar ${label} em 1`} onClick={() => onAdjust(1)}><Plus /></Button>
      </div><span className="text-sm text-zinc-400">{description}</span></div> : <div className="mt-4 divide-y divide-white/10 border-t border-white/10 [&>div]:py-3 [&>div:last-child]:pb-0">{children}</div>}
    </section>
  );
}
