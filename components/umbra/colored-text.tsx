"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function ColorPalette({ onSelect }: { onSelect: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" className="h-8 border-white/10 text-xs" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {open ? "Ocultar cores" : "Mostrar cores"}
      </Button>
      {open ? (
        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1" aria-label="Escolha uma cor">
          {minecraftColors.map(([code, name, color]) => (
            <Button key={code} type="button" variant="outline" className="h-8 shrink-0 gap-1.5 border-white/10 px-2" onClick={() => onSelect(code)} title={`${name} (&${code})`} aria-label={`Aplicar ${name}`}>
              <span className="size-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
              <code className="text-xs">&amp;{code}</code>
            </Button>
          ))}
          <Button type="button" variant="outline" className="h-8 shrink-0 border-white/10 px-2 text-xs" onClick={() => onSelect("r")} title="Voltar à cor normal">&amp;r Normal</Button>
        </div>
      ) : null}
    </div>
  );
}

export function ColoredTextarea({ id, value, onChange, rows = 4 }: { id: string; value: string; onChange: (value: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return <div className="space-y-2"><Textarea ref={ref} id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-black/20" /><ColorPalette onSelect={(code) => insertColorCode(ref.current, value, onChange, code)} /></div>;
}

export function ColoredInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return <div className="space-y-2"><Input ref={ref} id={id} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-black/25" /><ColorPalette onSelect={(code) => insertColorCode(ref.current, value, onChange, code)} /></div>;
}

function insertColorCode(element: HTMLInputElement | HTMLTextAreaElement | null, value: string, onChange: (value: string) => void, code: string) {
  const start = element?.selectionStart ?? value.length;
  const end = element?.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  onChange(`${value.slice(0, start)}&${code}${selected}${selected ? "&r" : ""}${value.slice(end)}`);
  requestAnimationFrame(() => {
    element?.focus();
    const position = start + 2 + selected.length;
    element?.setSelectionRange(position, position);
  });
}
