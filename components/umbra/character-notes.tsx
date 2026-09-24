"use client";

import { useRef, useState } from "react";
import { Bold, Heading2, Italic, List, ListOrdered, Quote, TextCursorInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Format = "bold" | "italic" | "heading" | "bullet" | "numbered" | "quote";

const formatActions: Array<{ format: Format; label: string; icon: typeof Bold }> = [
  { format: "bold", label: "Negrito", icon: Bold },
  { format: "italic", label: "Itálico", icon: Italic },
  { format: "heading", label: "Título", icon: Heading2 },
  { format: "bullet", label: "Lista", icon: List },
  { format: "numbered", label: "Lista numerada", icon: ListOrdered },
  { format: "quote", label: "Citação", icon: Quote },
];

export function CharacterNotesEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showFormatting, setShowFormatting] = useState(false);

  function applyFormat(format: Format) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    let replacement = selected;
    let selectionOffset = 0;

    if (format === "bold" || format === "italic") {
      const marker = format === "bold" ? "**" : "*";
      replacement = `${marker}${selected || (format === "bold" ? "texto em negrito" : "texto em itálico")}${marker}`;
      selectionOffset = marker.length;
    } else {
      const prefix = format === "heading" ? "## " : format === "bullet" ? "- " : "> ";
      const target = value.slice(lineStart, end);
      replacement = target.split("\n").map((line, index) => `${format === "numbered" ? `${index + 1}. ` : prefix}${line}`).join("\n");
      onChange(`${value.slice(0, lineStart)}${replacement}${value.slice(end)}`);
      requestAnimationFrame(() => textarea?.focus());
      return;
    }

    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      const nextStart = start + selectionOffset;
      textarea?.setSelectionRange(nextStart, nextStart + (selected.length || replacement.length - selectionOffset * 2));
    });
  }

  function continueList(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const currentLine = value.slice(lineStart, start);
    const marker = currentLine.match(/^(\s*)(-\s|([0-9]+)\.\s)/);
    if (!marker) return;

    event.preventDefault();
    const nextMarker = marker[3] ? `${Number(marker[3]) + 1}. ` : "- ";
    const insertion = `\n${marker[1]}${nextMarker}`;
    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`);
    requestAnimationFrame(() => {
      const nextPosition = start + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(nextPosition, nextPosition);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="border-white/10" aria-expanded={showFormatting} onClick={() => setShowFormatting((open) => !open)}>
          <TextCursorInput />
          Formatar texto
        </Button>
        <span className="text-xs text-zinc-500">Selecione um trecho e escolha a formatação.</span>
      </div>
      {showFormatting ? (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/[.07] bg-black/20 p-2" aria-label="Opções de formatação">
          {formatActions.map(({ format, label, icon: Icon }) => (
            <Button key={format} type="button" variant="ghost" size="sm" onClick={() => applyFormat(format)} title={label} aria-label={label}>
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      ) : null}
      <Textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={continueList} rows={14} className="min-h-72 resize-y border-white/10 bg-black/20 leading-7" placeholder="Registre pistas, planos, acontecimentos e lembretes da aventura…" />
    </div>
  );
}

export function FormattedNotes({ content }: { content: string }) {
  if (!content.trim()) return <p className="text-sm text-zinc-600">Nenhuma nota registrada.</p>;

  return (
    <div className="space-y-2 text-sm leading-7 text-zinc-300">
      {content.split("\n").map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-2" aria-hidden="true" />;
        if (line.startsWith("## ")) return <h3 key={index} className="pt-3 font-serif text-xl text-white first:pt-0">{renderInline(line.slice(3))}</h3>;
        if (line.startsWith("> ")) return <blockquote key={index} className="border-l-2 border-violet-400/50 pl-4 italic text-zinc-400">{renderInline(line.slice(2))}</blockquote>;
        if (line.startsWith("- ")) return <div key={index} className="flex gap-3"><span className="text-violet-300">•</span><p>{renderInline(line.slice(2))}</p></div>;
        const numbered = line.match(/^(\d+)\.\s(.*)$/);
        if (numbered) return <div key={index} className="flex gap-3"><span className="min-w-5 text-right text-violet-300">{numbered[1]}.</span><p>{renderInline(numbered[2])}</p></div>;
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold text-zinc-100">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}
