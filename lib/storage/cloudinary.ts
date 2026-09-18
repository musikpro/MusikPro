import crypto from "node:crypto";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);


function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

async function detectImageType(file: File) {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (startsWith(head, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  const ascii = new TextDecoder("ascii").decode(head);
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "image/gif";
  if (ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (ascii.slice(4, 8) === "ftyp" && /(?:avif|avis)/.test(ascii.slice(8, 24))) return "image/avif";
  return null;
}

function requireCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  }
  return { cloudName, apiKey, apiSecret };
}

function signParams(params: Record<string, string | number>, apiSecret: string) {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex");
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export async function uploadImageToCloudinary(file: File, options?: { folder?: string }) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Unsupported image type");
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error("Image must be between 1 byte and 10 MB");
  const detectedType = await detectImageType(file);
  if (!detectedType || detectedType !== file.type) throw new Error("Image content does not match its declared MIME type");

  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = (options?.folder || process.env.CLOUDINARY_FOLDER || "africa-saas-kit").replace(/[^a-zA-Z0-9_\-/]/g, "-");
  const params = { folder, timestamp };
  const signature = signParams(params, apiSecret);
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(`Cloudinary upload failed with HTTP ${response.status}`);
  const data = await response.json() as {
    public_id?: string;
    secure_url?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  };
  if (!data.public_id || !data.secure_url) throw new Error("Cloudinary returned an incomplete upload response");
  return {
    publicId: data.public_id,
    url: data.secure_url,
    width: data.width ?? null,
    height: data.height ?? null,
    format: data.format ?? null,
    bytes: data.bytes ?? file.size,
  };
}
