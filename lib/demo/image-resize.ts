const MAX_DIMENSION = 2000;
const TARGET_BYTES = 2 * 1024 * 1024;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;

export function computeTargetDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const scale = width >= height ? maxDimension / width : maxDimension / height;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Redimensionne et recompresse une image côté navigateur avant son envoi, pour qu'une photo de
 * téléphone (souvent 8-20 Mo) ne dépasse jamais la limite serveur ni ne déclenche la troncature
 * silencieuse de Next.js sur les gros corps de requête (voir next.config.ts).
 */
export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}
