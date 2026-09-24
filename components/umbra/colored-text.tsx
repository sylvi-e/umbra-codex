"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const minecraftColors = [
  ["0", "Preto", "#000000"], ["1", "Azul escuro", "#0000aa"],
  ["2", "Verde escuro", "#00aa00"], ["3", "Ciano escuro", "#00aaaa"],
  ["4", "Vermelho escuro", "#aa0000"], ["5", "Roxo", "#aa00aa"],
  ["6", "Dourado", "#ffaa00"], ["7", "Cinza", "#aaaaaa"],
  ["8", "Cinza escuro", "#555555"], ["9", "Azul", "#5555ff"],
  ["a", "Verde", "#55ff55"], ["b", "Ciano", "#55ffff"],
  ["c", "Vermelho", "#ff5555"], ["d", "Rosa", "#ff55ff"],
  ["e", "Amarelo", "#ffff55"], ["f", "Branco", "#ffffff"],
] as const;

const colorByCode = Object.fromEntries(minecraftColors.map(([code, , color]) => [code, color]));

export function ColoredText({ text, className = "" }: { text: string; className?: string }) {
  const parts: Array<{ text: string; color?: string }> = [];
  let color: string | undefined;
  let start = 0;
  const matcher = /&([0-9a-fr])/gi;
  for (const match of text.matchAll(matcher)) {
    if (match.index! > start) parts.push({ text: text.slice(start, match.index), color });
    const code = match[1].toLowerCase();
    color = code === "r" ? undefined : colorByCode[code];
    start = match.index! + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start), color });
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, index) => <span key={index} style={part.color ? { color: part.color } : undefined}>{part.text}</span>)}
    </span>
  );
}

export function ColoredTextarea({ id, value, onChange, rows = 4 }: { id: string; value: string; onChange: (value: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insertCode(code: string) {
    const element = ref.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}&${code}${value.slice(start, end)}${start !== end ? "&r" : ""}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      element?.focus();
      const position = start + 2 + (end - start);
      element?.setSelectionRange(position, position);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" aria-label="Cores do texto">
        {minecraftColors.map(([code, name, color]) => (
          <Button key={code} type="button" size="icon" variant="outline" className="size-7 border-white/10" onClick={() => insertCode(code)} title={`&${code} — ${name}`} aria-label={`Aplicar ${name}`}>
            <span className="size-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" className="h-7 border-white/10 px-2 text-xs" onClick={() => insertCode("r")} title="&r — restaurar cor padrão">&r Normal</Button>
      </div>
      <Textarea ref={ref} id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-black/20" />
      <p className="text-xs text-zinc-600">Selecione um trecho e escolha uma cor, ou digite um código como &6.</p>
    </div>
  );
}
