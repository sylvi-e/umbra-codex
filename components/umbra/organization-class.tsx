"use client";

import { useId } from "react";
import { ColoredText } from "@/components/umbra/colored-text";
import { findOrganizationClass, organizationClasses, organizationClassTiers, classPercentages } from "@/lib/organization-classes";
import type { OrganizationSheet } from "@/lib/organization-rules";

type ClassFields = Pick<OrganizationSheet, "className" | "subclass" | "percentage" | "accustomedPercentage" | "classNotes">;
type Props = {
  sheet: OrganizationSheet;
  readOnly?: boolean;
  mode?: "settings" | "abilities";
  onChange?: (changes: Partial<ClassFields>) => void;
};
const selectStyle = "h-10 w-full rounded-lg border border-white/10 bg-background px-3 text-sm disabled:opacity-80";

export function OrganizationClass({ sheet, readOnly = false, mode = "settings", onChange }: Props) {
  const id = useId();
  const definition = findOrganizationClass(sheet.className);
  const subclass = definition?.subclasses.find((entry) => entry.name === sheet.subclass);
  const tiers = organizationClassTiers(sheet.className, sheet.subclass, sheet.percentage);

  if (mode === "settings") return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2"><span className="text-sm">Classe</span>
          <select aria-label="Classe" className={selectStyle} disabled={readOnly} value={definition?.name ?? sheet.className} onChange={(event) => onChange?.({ className: event.target.value, subclass: "" })}>
            <option value="">Selecione uma classe</option>
            {sheet.className && !definition && <option value={sheet.className}>{sheet.className} (personalizada)</option>}
            {organizationClasses.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
          </select>
        </label>
        {definition && definition.subclasses.length > 0 && <label className="space-y-2"><span className="text-sm">{definition.name === "Assinante de Pacto" ? "Patrono" : "Subclasse"}</span>
          <select aria-label={definition.name === "Assinante de Pacto" ? "Patrono" : "Subclasse"} className={selectStyle} disabled={readOnly} value={sheet.subclass} onChange={(event) => onChange?.({ subclass: event.target.value })}>
            <option value="">Escolha uma opção</option>
            {sheet.subclass && !subclass && <option value={sheet.subclass}>{sheet.subclass}</option>}
            {definition.subclasses.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
          </select>
          <p className="text-xs text-zinc-500">Uma escolha no início da campanha.</p>
        </label>}
        <label className="space-y-2"><span className="text-sm">Porcentagem em uso</span>
          <select aria-label="Porcentagem em uso" className={selectStyle} disabled={readOnly} value={sheet.percentage} onChange={(event) => onChange?.({ percentage: Number(event.target.value) })}>
            {!classPercentages.some((value) => value === sheet.percentage) && <option value={sheet.percentage}>{sheet.percentage}% (valor anterior)</option>}
            {classPercentages.map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <p className="text-xs text-zinc-500">Define quais habilidades e aprimoramentos estão disponíveis.</p>
        </label>
        <label className="space-y-2"><span className="text-sm">Porcentagem acostumada</span>
          <select aria-label="Porcentagem acostumada" className={selectStyle} disabled={readOnly} value={sheet.accustomedPercentage} onChange={(event) => onChange?.({ accustomedPercentage: Number(event.target.value) })}>
            {classPercentages.map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <p className="text-xs text-zinc-500">Registre o valor definido com o mestre.</p>
        </label>
      </div>
      {definition && <ClassIntroduction definition={definition} subclassDescription={subclass?.description} />}
      <div className="space-y-2">
        <label htmlFor={id} className="text-sm font-medium">Poderes personalizados e definições com o mestre</label>
        {readOnly ? <p className="whitespace-pre-wrap rounded-xl border border-white/10 p-4 text-sm text-zinc-300">{sheet.classNotes || "A definir com o mestre."}</p> : <textarea id={id} rows={6} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" placeholder="Registre peculiaridades de 90% e 100%, poderes inatos, patronos ou divinos personalizados e as regras combinadas com o mestre." value={sheet.classNotes} onChange={(event) => onChange?.({ classNotes: event.target.value })} />}
      </div>
      <p className="text-sm text-zinc-400">Consulte as regras em Habilidades → Porcentagem. Os bônus são uma referência para ajuste manual da ficha.</p>
    </div>
  );

  if (!definition) return <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">{sheet.className ? "Classe personalizada. Registre suas regras nas habilidades ou na Progressão." : "Escolha uma classe na aba Progressão para consultar suas habilidades."}</p>;

  return (
    <section aria-label="Habilidades da classe" className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-serif text-xl">{definition.name}{subclass ? ` · ${subclass.name}` : ""}</h3><span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm text-violet-200">Em uso: {sheet.percentage}%</span></div>
      <p className="text-sm text-zinc-400">As faixas anteriores continuam disponíveis. Os valores aprimorados descritos em uma habilidade substituem seus valores anteriores.</p>
      <ClassIntroduction definition={definition} subclassDescription={subclass?.description} />
      {definition.subclasses.length > 0 && !subclass && <p className="text-sm text-amber-200">Escolha uma subclasse ou patrono na Progressão para ver suas habilidades específicas.</p>}
      <div className="space-y-3">
        {tiers.map((tier) => <details key={`${definition.name}-${sheet.subclass}-${tier.percentage}-${tier.available}`} open={tier.available} className={`rounded-xl border ${tier.available ? "border-violet-400/20 bg-violet-500/[.04]" : "border-white/10 bg-white/[.015]"}`}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">{tier.percentage}% <span className={`ml-2 text-xs font-normal ${tier.available ? "text-violet-300" : "text-zinc-500"}`}>{tier.available ? "Disponível" : "Acima da porcentagem em uso"}</span></summary>
          <div className="space-y-4 border-t border-white/5 p-4">
            {tier.abilities.length ? tier.abilities.map((ability, index) => <article key={`${ability.name}-${index}`}><h4 className="text-sm font-semibold text-violet-100">{ability.name}</h4><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{ability.description}</p></article>) : <p className="text-sm text-zinc-500">A definir com o mestre.</p>}
          </div>
        </details>)}
      </div>
      {sheet.classNotes && <div className="rounded-xl border border-white/10 p-4"><h4 className="mb-2 text-sm font-semibold">Definições do personagem</h4><p className="whitespace-pre-wrap text-sm text-zinc-300">{sheet.classNotes}</p></div>}
    </section>
  );
}

function ClassIntroduction({ definition, subclassDescription }: { definition: NonNullable<ReturnType<typeof findOrganizationClass>>; subclassDescription?: string }) {
  return <div className="space-y-3 rounded-xl border border-white/10 bg-black/15 p-4 text-sm leading-relaxed text-zinc-400">
    <p>{definition.description}</p>
    <p><span className="font-medium text-zinc-300">Armas e equipamentos: </span>{definition.weapons}</p>
    <p><span className="font-medium text-zinc-300">Bônus e penalidades (ajuste manual): </span><ColoredText text={definition.status} /></p>
    {subclassDescription && <p className="whitespace-pre-wrap border-t border-white/10 pt-3">{subclassDescription}</p>}
  </div>;
}
