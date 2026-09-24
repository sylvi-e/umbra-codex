"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const portraitSize = 512;
const targetBytes = 250 * 1024;

export function CharacterPortraitEditor({ characterId, value, onChange }: { characterId?: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function selectFile(file?: File) {
    if (!file || !characterId || uploading) return;
    if (!file.type.startsWith("image/")) return void toast.error("Escolha um arquivo de imagem.");
    if (file.size > 15 * 1024 * 1024) return void toast.error("A imagem original deve ter no máximo 15 MB.");

    setUploading(true);
    try {
      const portrait = await preparePortrait(file);
      const client = createClient();
      if (!client) throw new Error("O armazenamento não está disponível.");
      const path = `${characterId}/portrait.webp`;
      const { error } = await client.storage.from("character-portraits").upload(path, portrait, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;
      onChange(path);
      toast.success(`Retrato otimizado para 512 × 512 (${formatBytes(portrait.size)}).`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível enviar o retrato.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="grim-card overflow-hidden rounded-2xl p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Portrait imageUrl={value} name="Retrato do personagem" editable />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl">Retrato do personagem</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">A imagem é recortada ao centro, redimensionada para 512 × 512 e convertida para WebP antes do upload.</p>
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
          <Button type="button" variant="outline" className="mt-4 border-white/10" disabled={!characterId || uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
            {uploading ? "Otimizando e enviando…" : value ? "Trocar imagem" : "Escolher imagem"}
          </Button>
          {!characterId ? <p className="mt-2 text-xs text-amber-300/80">Salve a ficha antes de adicionar o retrato.</p> : null}
        </div>
      </div>
    </section>
  );
}

export function CharacterPortraitCard({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  return (
    <section className="grim-card rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2 text-sm text-zinc-400"><Camera size={17} className="text-violet-300" /> Retrato</div>
      <Portrait imageUrl={imageUrl ?? ""} name={name} />
    </section>
  );
}

function Portrait({ imageUrl, name, editable = false }: { imageUrl: string; name: string; editable?: boolean }) {
  const resolvedUrl = usePortraitUrl(imageUrl);
  return (
    <div className={`${editable ? "size-40" : "aspect-square w-full"} shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,.22),transparent_58%),rgba(255,255,255,.025)]`}>
      {resolvedUrl ? <div role="img" aria-label={name} className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(resolvedUrl)})` }} /> : <div className="grid size-full place-items-center text-zinc-600"><Camera className="size-10" /><span className="sr-only">Sem retrato</span></div>}
    </div>
  );
}

function usePortraitUrl(value: string) {
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    if (!value || value.startsWith("http")) return;
    let active = true;
    const client = createClient();
    if (!client) return;
    void (async () => {
      const result = await client.storage.from("character-portraits").createSignedUrl(value, 3600);
      if (active) setSigned({ path: value, url: result.error ? "" : result.data.signedUrl });
    })();
    return () => { active = false; };
  }, [value]);
  if (!value || value.startsWith("http")) return value;
  return signed?.path === value ? signed.url : "";
}

async function preparePortrait(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = portraitSize;
  canvas.height = portraitSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu processar a imagem.");
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;
  context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, portraitSize, portraitSize);
  bitmap.close();

  let quality = 0.9;
  let result = await canvasToWebp(canvas, quality);
  while (result.size > targetBytes && quality > 0.46) {
    quality -= 0.08;
    result = await canvasToWebp(canvas, quality);
  }
  return new File([result], "portrait.webp", { type: "image/webp" });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível converter a imagem para WebP.")), "image/webp", quality));
}

function formatBytes(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
