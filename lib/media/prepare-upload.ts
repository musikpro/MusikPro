import { computeTargetDimensions } from "@/lib/demo/image-resize";

/**
 * Préparation d'une image dans le navigateur avant son envoi à la médiathèque : redimensionnement,
 * compression et conversion AVIF (quand le navigateur sait encoder l'AVIF, sinon WebP — le serveur
 * convertit dans tous les cas en AVIF, voir lib/storage/cloudinary.ts). Sert surtout à garder chaque
 * envoi sous la limite de 4,5 Mo des requêtes Vercel, qu'une photo brute dépasse vite.
 */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const;

const MAX_DIMENSION = 2400;
// Sous la limite de corps de requête de Vercel Functions (4,5 Mo), avec de la marge pour le multipart.
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const START_QUALITY = 0.8;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.15;

export function isAcceptedImage(file: File): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

let canvasAvifSupport: boolean | undefined;
function canEncodeAvif(): boolean {
  if (canvasAvifSupport === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    canvasAvifSupport = canvas.toDataURL("image/avif").startsWith("data:image/avif");
  }
  return canvasAvifSupport;
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob && blob.type === type ? blob : null), type, quality),
  );
}

/** Retourne le fichier à envoyer : converti/compressé si possible, sinon l'original (le serveur valide). */
export async function prepareImageForUpload(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);
    const unchangedSize = width === bitmap.width && height === bitmap.height;

    // Déjà de l'AVIF léger et de taille raisonnable : rien à refaire (évite une perte de qualité).
    if (file.type === "image/avif" && unchangedSize && file.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const type = canEncodeAvif() ? "image/avif" : "image/webp";
    let quality = START_QUALITY;
    let blob = await encode(canvas, type, quality);
    while (blob && blob.size > MAX_UPLOAD_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      blob = await encode(canvas, type, quality);
    }
    if (!blob) return file;
    // Le navigateur n'a rien gagné et l'original passe déjà : on l'envoie tel quel (le serveur le convertit en AVIF).
    if (blob.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file;
    return toFile(blob, file, type);
  } catch {
    return file;
  }
}

function toFile(blob: Blob, original: File, type: string): File {
  const extension = type === "image/avif" ? "avif" : "webp";
  return new File([blob], `${original.name.replace(/\.[^.]+$/, "") || "image"}.${extension}`, { type });
}
