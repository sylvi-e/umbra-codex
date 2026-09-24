"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export function ColorCodeHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="outline" className="size-8 shrink-0 border-white/10" aria-label="Ajuda sobre cores" title="Comandos de cores">?</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#100e16] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comandos de cores</DialogTitle>
          <DialogDescription>Digite o código antes do texto. A cor continua até outro código ou até &amp;r.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2 sm:grid-cols-2">
          {minecraftColors.map(([code, name, color]) => (
            <div key={code} className="flex items-center gap-3 rounded-lg border border-white/[.07] bg-black/20 px-3 py-2">
              <span className="size-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
              <code className="text-sm text-zinc-200">&amp;{code}</code>
              <span className="text-sm text-zinc-400">{name}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-lg border border-white/[.07] bg-black/20 px-3 py-2">
            <span className="size-3 rounded-full border border-white/20 bg-zinc-300" />
            <code className="text-sm text-zinc-200">&amp;r</code>
            <span className="text-sm text-zinc-400">Cor normal</span>
          </div>
        </div>
        <p className="rounded-lg bg-white/[.04] p-3 text-sm text-zinc-400"><code>&amp;6Espada dourada &amp;camaldiçoada&amp;r normal</code></p>
      </DialogContent>
    </Dialog>
  );
}

export function ColoredTextarea({ id, value, onChange, rows = 4 }: { id: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <div className="flex items-start gap-2"><Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-black/20" /><ColorCodeHelp /></div>;
}

export function ColoredInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <div className="flex items-center gap-2"><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-black/25" /><ColorCodeHelp /></div>;
}
