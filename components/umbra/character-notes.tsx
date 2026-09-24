"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, GripHorizontal, Heading2, Italic, List, ListOrdered, LoaderCircle, Pin, PinOff, Plus, Quote, TextCursorInput, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const boardUnits = 1000;
const minNoteWidth = 180;
const minNoteHeight = 160;

export type BoardNote = {
  id: string;
  title: string | null;
  content: string;
  board_x: number;
  board_y: number;
  board_width: number;
  board_height: number;
  z_index: number;
  is_pinned: boolean;
};

export function CharacterNotesBoardView({ notes }: { notes: BoardNote[] }) {
  if (!notes.length) return <p className="text-sm text-zinc-600">Nenhuma nota fixada.</p>;

  return (
    <div className="relative min-h-[620px] overflow-hidden rounded-2xl border border-white/[.08] bg-[radial-gradient(circle_at_25%_15%,rgba(124,58,237,.09),transparent_35%),rgba(0,0,0,.18)] sm:min-h-[680px]">
      {notes.map((note) => (
        <article key={note.id} className="absolute flex min-w-0 flex-col overflow-hidden rounded-xl border border-violet-300/20 bg-[#18151f] shadow-2xl shadow-black/40" style={noteStyle(note)}>
          <header className="flex items-center gap-2 border-b border-white/[.07] bg-white/[.035] px-3 py-2">
            <Pin className="size-4 shrink-0 text-violet-300" />
            <h3 className="min-w-0 truncate font-serif text-base text-zinc-100">{note.title || "Sem título"}</h3>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <FormattedNotes content={note.content} />
          </div>
        </article>
      ))}
    </div>
  );
}

type Gesture = {
  kind: "move" | "resize";
  noteId: string;
  pointerId: number;
  startX: number;
  startY: number;
  boardWidth: number;
  boardHeight: number;
  origin: BoardNote;
};

export function CharacterNotesBoard({ characterId, userId }: { characterId: string; userId: string }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const notesRef = useRef<BoardNote[]>([]);
  const [notes, setNotes] = useState<BoardNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void client
      .from("character_notes")
      .select("id,title,content,board_x,board_y,board_width,board_height,z_index,is_pinned")
      .eq("character_id", characterId)
      .eq("note_type", "player")
      .order("z_index")
      .then((result: { data: unknown[] | null; error: { message: string } | null }) => {
        const { data, error } = result;
        if (error) toast.error(`Não foi possível carregar as notas: ${error.message}`);
        else {
          const loaded = (data ?? []) as BoardNote[];
          notesRef.current = loaded;
          setNotes(loaded);
        }
        setLoading(false);
      });
  }, [characterId]);

  async function createNote() {
    if (!userId || creating) return;
    setCreating(true);
    const position = 24 + ((notes.length % 6) * 34);
    const zIndex = Math.max(0, ...notes.map((note) => note.z_index)) + 1;
    const client = createClient();
    const { data, error } = await client!
      .from("character_notes")
      .insert({
        character_id: characterId,
        author_id: userId,
        title: "Nova nota",
        content: "",
        note_type: "player",
        visibility: "owner_masters",
        board_x: position,
        board_y: position,
        board_width: 320,
        board_height: 300,
        z_index: zIndex,
        is_pinned: false,
      })
      .select("id,title,content,board_x,board_y,board_width,board_height,z_index,is_pinned")
      .single();
    setCreating(false);
    if (error) return void toast.error(`Não foi possível criar a nota: ${error.message}`);
    setNotes((current) => {
      const next = [...current, data as BoardNote];
      notesRef.current = next;
      return next;
    });
  }

  function patchNote(id: string, patch: Partial<BoardNote>, persist = false) {
    setNotes((current) => {
      const next = current.map((note) => note.id === id ? { ...note, ...patch } : note);
      notesRef.current = next;
      return next;
    });
    if (persist) void saveNote(id, patch);
  }

  function debounceNote(id: string, patch: Pick<BoardNote, "title"> | Pick<BoardNote, "content">) {
    patchNote(id, patch);
    const currentTimer = saveTimers.current.get(id);
    if (currentTimer) clearTimeout(currentTimer);
    saveTimers.current.set(id, setTimeout(() => {
      saveTimers.current.delete(id);
      void saveNote(id, patch);
    }, 600));
  }

  async function saveNote(id: string, patch: Partial<BoardNote>) {
    const { error } = await createClient()!
      .from("character_notes")
      .update(patch)
      .eq("id", id)
      .eq("character_id", characterId);
    if (error) toast.error(`Não foi possível salvar a nota: ${error.message}`);
  }

  async function removeNote(note: BoardNote) {
    if (!window.confirm(`Excluir a nota “${note.title || "Sem título"}”?`)) return;
    const { error } = await createClient()!
      .from("character_notes")
      .delete()
      .eq("id", note.id)
      .eq("character_id", characterId);
    if (error) return void toast.error(`Não foi possível excluir a nota: ${error.message}`);
    setNotes((current) => {
      const next = current.filter((item) => item.id !== note.id);
      notesRef.current = next;
      return next;
    });
  }

  function startGesture(event: React.PointerEvent<HTMLElement>, note: BoardNote, kind: Gesture["kind"]) {
    if (note.is_pinned) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const topZ = Math.max(0, ...notes.map((item) => item.z_index)) + 1;
    const raised = { ...note, z_index: topZ };
    patchNote(note.id, { z_index: topZ });
    gestureRef.current = {
      kind,
      noteId: note.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      boardWidth: board.width,
      boardHeight: board.height,
      origin: raised,
    };
  }

  function continueGesture(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = ((event.clientX - gesture.startX) / gesture.boardWidth) * boardUnits;
    const dy = ((event.clientY - gesture.startY) / gesture.boardHeight) * boardUnits;
    if (gesture.kind === "move") {
      patchNote(gesture.noteId, {
        board_x: clamp(Math.round(gesture.origin.board_x + dx), 0, boardUnits - gesture.origin.board_width),
        board_y: clamp(Math.round(gesture.origin.board_y + dy), 0, boardUnits - gesture.origin.board_height),
      });
    } else {
      patchNote(gesture.noteId, {
        board_width: clamp(Math.round(gesture.origin.board_width + dx), minNoteWidth, boardUnits - gesture.origin.board_x),
        board_height: clamp(Math.round(gesture.origin.board_height + dy), minNoteHeight, boardUnits - gesture.origin.board_y),
      });
    }
  }

  function finishGesture(event: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const current = notesRef.current.find((note) => note.id === gesture.noteId);
    gestureRef.current = null;
    if (!current) return;
    void saveNote(current.id, {
      board_x: current.board_x,
      board_y: current.board_y,
      board_width: current.board_width,
      board_height: current.board_height,
      z_index: current.z_index,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Arraste pelo topo da nota e redimensione pelo canto inferior direito.</p>
        <Button type="button" className="bg-violet-600 hover:bg-violet-500" disabled={creating || !userId} onClick={() => void createNote()}>
          {creating ? <LoaderCircle className="animate-spin" /> : <Plus />}
          Criar nota
        </Button>
      </div>
      <div ref={boardRef} className="relative min-h-[620px] overflow-hidden rounded-2xl border border-white/[.08] bg-[radial-gradient(circle_at_25%_15%,rgba(124,58,237,.09),transparent_35%),rgba(0,0,0,.18)] sm:min-h-[680px]">
        {loading ? <div className="grid min-h-[620px] place-items-center text-zinc-500"><LoaderCircle className="animate-spin" /></div> : null}
        {!loading && !notes.length ? <div className="grid min-h-[620px] place-items-center px-6 text-center text-sm text-zinc-500">Nenhuma nota avulsa. Use “Criar nota” para começar.</div> : null}
        {notes.map((note) => (
          <article
            key={note.id}
            className="absolute flex min-w-0 flex-col overflow-hidden rounded-xl border border-violet-300/20 bg-[#18151f] shadow-2xl shadow-black/40"
            style={noteStyle(note)}
            onPointerDown={() => {
              const topZ = Math.max(0, ...notes.map((item) => item.z_index));
              if (note.z_index < topZ) patchNote(note.id, { z_index: topZ + 1 }, true);
            }}
          >
            <header
              className={`flex touch-none items-center gap-2 border-b border-white/[.07] bg-white/[.035] px-2 py-1.5 ${note.is_pinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
              onPointerDown={(event) => startGesture(event, note, "move")}
              onPointerMove={continueGesture}
              onPointerUp={finishGesture}
              onPointerCancel={finishGesture}
            >
              <GripHorizontal className="size-4 shrink-0 text-violet-300/70" />
              <Input
                value={note.title ?? ""}
                onPointerDown={(event) => event.stopPropagation()}
                onChange={(event) => debounceNote(note.id, { title: event.target.value })}
                className="h-8 min-w-0 border-0 bg-transparent px-1 font-serif text-base shadow-none focus-visible:ring-1"
                placeholder="Nome da nota"
                aria-label="Nome da nota"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={note.is_pinned ? "shrink-0 text-violet-300" : "shrink-0 text-zinc-500 hover:text-violet-300"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => patchNote(note.id, { is_pinned: !note.is_pinned }, true)}
                aria-label={note.is_pinned ? `Desafixar ${note.title || "nota"}` : `Fixar ${note.title || "nota"}`}
                title={note.is_pinned ? "Desafixar nota" : "Fixar nota"}
              >
                {note.is_pinned ? <PinOff /> : <Pin />}
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-zinc-500 hover:text-rose-300" onPointerDown={(event) => event.stopPropagation()} onClick={() => void removeNote(note)} aria-label={`Excluir ${note.title || "nota"}`}>
                <Trash2 />
              </Button>
            </header>
            <BoardNoteBody note={note} onChange={(content) => debounceNote(note.id, { content })} />
            {!note.is_pinned ? <button
                type="button"
                className="absolute bottom-0 right-0 size-6 touch-none cursor-nwse-resize border-b-2 border-r-2 border-violet-300/60 bg-transparent"
                onPointerDown={(event) => startGesture(event, note, "resize")}
                onPointerMove={continueGesture}
                onPointerUp={finishGesture}
                onPointerCancel={finishGesture}
                aria-label={`Redimensionar ${note.title || "nota"}`}
              /> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function BoardNoteBody({ note, onChange }: { note: BoardNote; onChange: (content: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyFormat(format: Format) {
    const textarea = textareaRef.current;
    const value = note.content;
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
    const start = event.currentTarget.selectionStart;
    const end = event.currentTarget.selectionEnd;
    const lineStart = note.content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const marker = note.content.slice(lineStart, start).match(/^(\s*)(-\s|([0-9]+)\.\s)/);
    if (!marker) return;
    event.preventDefault();
    const nextMarker = marker[3] ? `${Number(marker[3]) + 1}. ` : "- ";
    const insertion = `\n${marker[1]}${nextMarker}`;
    onChange(`${note.content.slice(0, start)}${insertion}${note.content.slice(end)}`);
    requestAnimationFrame(() => {
      const nextPosition = start + insertion.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextPosition, nextPosition);
    });
  }

  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-white/[.06] bg-black/10 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Formatação da nota">
      {formatActions.map(({ format, label, icon: Icon }) => <Button key={format} type="button" variant="ghost" size="icon-sm" className="shrink-0 text-zinc-400 hover:text-violet-200" onClick={() => applyFormat(format)} title={label} aria-label={label}><Icon /></Button>)}
    </div>
    <Textarea
      ref={textareaRef}
      value={note.content}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={continueList}
      className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent p-3 leading-6 shadow-none focus-visible:ring-0"
      placeholder="Escreva sua nota…"
      aria-label={`Conteúdo de ${note.title || "nota sem título"}`}
    />
  </div>;
}

function noteStyle(note: BoardNote) {
  return {
    left: `${(note.board_x / boardUnits) * 100}%`,
    top: `${(note.board_y / boardUnits) * 100}%`,
    width: `${(note.board_width / boardUnits) * 100}%`,
    height: `${(note.board_height / boardUnits) * 100}%`,
    zIndex: note.z_index,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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
