"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, Move, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@/lib/supabase/client";

const portraitSize = 512;
const targetBytes = 250 * 1024;

type CropSelection = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function CharacterPortraitEditor({ characterId, value, onChange }: { characterId?: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewUrlRef = useRef("");
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [crop, setCrop] = useState<CropSelection | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  async function selectFile(file?: File) {
    if (!file || !characterId || uploading) return;
    if (!file.type.startsWith("image/")) return void toast.error("Escolha um arquivo de imagem.");
    if (file.size > 15 * 1024 * 1024) return void toast.error("A imagem original deve ter no máximo 15 MB.");

    try {
      const bitmap = await createImageBitmap(file);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      const selection: CropSelection = {
        file,
        previewUrl,
        width: bitmap.width,
        height: bitmap.height,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      };
      bitmap.close();
      setCrop(selection);
    } catch {
      toast.error("Não foi possível abrir esta imagem.");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function closeCrop() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setCrop(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateCrop(next: Partial<CropSelection>) {
    setCrop((current) => current ? clampCrop({ ...current, ...next }) : null);
  }

  function startDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (!crop || !previewRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: crop.offsetX,
      offsetY: crop.offsetY,
    };
  }

  function drag(event: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    const size = previewRef.current?.clientWidth;
    if (!start || start.pointerId !== event.pointerId || !size) return;
    updateCrop({
      offsetX: start.offsetX + (event.clientX - start.x) / size,
      offsetY: start.offsetY + (event.clientY - start.y) / size,
    });
  }

  async function uploadCrop() {
    if (!crop || !characterId || uploading) return;

    setUploading(true);
    try {
      const portrait = await preparePortrait(crop);
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
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
      setCrop(null);
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
          <p className="mt-1 text-sm leading-6 text-zinc-500">Depois de escolher uma foto, ajuste o enquadramento que aparecerá no card e na ficha.</p>
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
          <Button type="button" variant="outline" className="mt-4 border-white/10" disabled={!characterId || uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
            {uploading ? "Otimizando e enviando…" : value ? "Trocar imagem" : "Escolher imagem"}
          </Button>
          {!characterId ? <p className="mt-2 text-xs text-amber-300/80">Salve a ficha antes de adicionar o retrato.</p> : null}
        </div>
      </div>
      <Dialog open={crop !== null} onOpenChange={(open) => { if (!open && !uploading) closeCrop(); }}>
        <DialogContent className="max-h-[95dvh] overflow-y-auto border-white/10 bg-[#100e16] sm:max-w-xl" showCloseButton={!uploading}>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Ajustar retrato</DialogTitle>
            <DialogDescription>Arraste a foto e use o zoom para escolher a parte que ficará visível.</DialogDescription>
          </DialogHeader>
          {crop ? <>
            <div
              ref={previewRef}
              className="relative mx-auto aspect-square w-full max-w-[420px] touch-none cursor-move select-none overflow-hidden rounded-2xl bg-black ring-1 ring-white/15"
              onPointerDown={startDragging}
              onPointerMove={drag}
              onPointerUp={() => { dragRef.current = null; }}
              onPointerCancel={() => { dragRef.current = null; }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crop.previewUrl}
                alt="Prévia do recorte do retrato"
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={cropPreviewStyle(crop)}
              />
              <div className="pointer-events-none absolute inset-0 border-[3px] border-white/70 shadow-[inset_0_0_0_999px_rgba(0,0,0,.08)]" />
              <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/25" />
              <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/25" />
              <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/25" />
              <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/25" />
            </div>
            <div className="space-y-5 rounded-xl border border-white/[.07] bg-black/20 p-4">
              <CropSlider icon={ZoomIn} label="Zoom" value={crop.zoom} min={1} max={3} step={0.01} onChange={(zoom) => updateCrop({ zoom })} />
              <CropSlider icon={Move} label="Horizontal" value={crop.offsetX} min={-cropLimits(crop).x} max={cropLimits(crop).x} step={0.001} onChange={(offsetX) => updateCrop({ offsetX })} />
              <CropSlider icon={Move} label="Vertical" value={crop.offsetY} min={-cropLimits(crop).y} max={cropLimits(crop).y} step={0.001} onChange={(offsetY) => updateCrop({ offsetY })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={uploading} onClick={closeCrop}>Cancelar</Button>
              <Button type="button" className="bg-violet-600 hover:bg-violet-500" disabled={uploading} onClick={() => void uploadCrop()}>
                {uploading ? <LoaderCircle className="animate-spin" /> : <Camera />}
                {uploading ? "Salvando retrato…" : "Usar este recorte"}
              </Button>
            </DialogFooter>
          </> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function CropSlider({ icon: Icon, label, value, min, max, step, onChange }: { icon: typeof Move; label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
      <Label className="flex items-center gap-2 text-zinc-300"><Icon className="size-4 text-violet-300" />{label}</Label>
      <span className="text-right text-xs text-zinc-500">{label === "Zoom" ? `${Math.round(value * 100)}%` : ""}</span>
      <Slider aria-label={label} className="col-span-2" value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onChange(next)} />
    </div>
  );
}

export function CharacterPortraitThumbnail({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const resolvedUrl = usePortraitUrl(imageUrl ?? "");
  if (!imageUrl) return null;
  return (
    <div className="mt-4 aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,.22),transparent_58%),rgba(255,255,255,.025)]">
      {resolvedUrl ? <div role="img" aria-label={`Retrato de ${name}`} className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(resolvedUrl)})` }} /> : <div className="grid size-full place-items-center text-zinc-600"><Camera className="size-8" /><span className="sr-only">Carregando retrato</span></div>}
    </div>
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

function cropLimits(crop: Pick<CropSelection, "width" | "height" | "zoom">) {
  const shortest = Math.min(crop.width, crop.height);
  return {
    x: Math.max(0, ((crop.width / shortest) * crop.zoom - 1) / 2),
    y: Math.max(0, ((crop.height / shortest) * crop.zoom - 1) / 2),
  };
}

function clampCrop(crop: CropSelection) {
  const limits = cropLimits(crop);
  return {
    ...crop,
    offsetX: Math.max(-limits.x, Math.min(limits.x, crop.offsetX)),
    offsetY: Math.max(-limits.y, Math.min(limits.y, crop.offsetY)),
  };
}

function cropPreviewStyle(crop: CropSelection) {
  const shortest = Math.min(crop.width, crop.height);
  return {
    width: `${(crop.width / shortest) * crop.zoom * 100}%`,
    height: `${(crop.height / shortest) * crop.zoom * 100}%`,
    left: `${(0.5 + crop.offsetX) * 100}%`,
    top: `${(0.5 + crop.offsetY) * 100}%`,
    transform: "translate(-50%, -50%)",
  };
}

async function preparePortrait(crop: CropSelection) {
  const bitmap = await createImageBitmap(crop.file);
  const canvas = document.createElement("canvas");
  canvas.width = portraitSize;
  canvas.height = portraitSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu processar a imagem.");
  const shortest = Math.min(bitmap.width, bitmap.height);
  const scale = (portraitSize / shortest) * crop.zoom;
  const drawnWidth = bitmap.width * scale;
  const drawnHeight = bitmap.height * scale;
  const x = (portraitSize - drawnWidth) / 2 + crop.offsetX * portraitSize;
  const y = (portraitSize - drawnHeight) / 2 + crop.offsetY * portraitSize;
  context.drawImage(bitmap, x, y, drawnWidth, drawnHeight);
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
