const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function compressImageToWebp(
  file: File,
  options: {
    maxDimension?: number;
    quality?: number;
    maxInputBytes?: number;
  } = {},
) {
  const maxDimension = options.maxDimension ?? 512;
  const quality = options.quality ?? 0.82;
  const maxInputBytes = options.maxInputBytes ?? 10 * 1024 * 1024;
  if (!ACCEPTED_IMAGE_TYPES.has(file.type))
    throw new Error("Formato de imagem não permitido.");
  if (file.size > maxInputBytes)
    throw new Error("A imagem excede o limite de 10 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context)
    throw new Error("Este navegador não permite processar a imagem.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Falha ao converter a imagem.")),
      "image/webp",
      quality,
    ),
  );
  const basename = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .toLowerCase();
  return new File(
    [blob],
    `${basename || "imagem"}-${crypto.randomUUID()}.webp`,
    { type: "image/webp" },
  );
}
