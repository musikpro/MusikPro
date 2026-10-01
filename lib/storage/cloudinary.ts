import crypto from "node:crypto";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
// Every image (song covers, media library, ...) is delivered at 2 MB or less so the site never
// gets weighed down by a heavy upload — Cloudinary re-compresses in place, no separate file kept.
const DEFAULT_TARGET_MAX_BYTES = 2 * 1024 * 1024;
// AVIF only: smaller than WebP/JPEG at equal quality, which also makes the 2 MB cap below easier
// to hit, and is supported by every current major browser.
const COMPRESSION_STEPS = [
  "q_auto:good,f_avif",
  "q_auto:eco,f_avif",
  "w_1600,c_limit,q_auto:low,f_avif",
  "w_1000,c_limit,q_auto:low,f_avif",
];

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
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
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
    process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

type CloudinaryUploadResult = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number;
};

async function cloudinaryExplicit(
  publicId: string,
  eager: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { eager, public_id: publicId, timestamp, type: "upload" };
  const signature = signParams(params, apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    type: "upload",
    eager,
    api_key: apiKey,
    timestamp: String(timestamp),
    signature,
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/explicit`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Cloudinary transform failed with HTTP ${response.status}`);
  const data = (await response.json()) as {
    eager?: Array<{ secure_url?: string; width?: number; height?: number; bytes?: number }>;
  };
  return data.eager?.[0] ?? null;
}

/**
 * Uploads with Cloudinary's "incoming transformation" so the delivered asset — not a separate
 * derivative — is already `q_auto,f_avif`-optimized, then escalates through cheaper/smaller
 * `explicit` transformations (no re-upload of the source bytes) until the asset is at or under
 * `maxBytes` (2 MB by default) so no image weighs down the site. A cover photo essentially always
 * clears this within the first one or two steps; the last step also caps pixel dimensions.
 */
export async function uploadImageToCloudinary(
  file: File,
  options?: { folder?: string; maxBytes?: number },
): Promise<CloudinaryUploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Unsupported image type");
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error("Image must be between 1 byte and 10 MB");
  const detectedType = await detectImageType(file);
  if (!detectedType || detectedType !== file.type)
    throw new Error("Image content does not match its declared MIME type");

  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  const maxBytes = options?.maxBytes ?? DEFAULT_TARGET_MAX_BYTES;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = (options?.folder || process.env.CLOUDINARY_FOLDER || "africa-saas-kit").replace(
    /[^a-zA-Z0-9_\-/]/g,
    "-",
  );
  const transformation = COMPRESSION_STEPS[0];
  const params = { folder, timestamp, transformation };
  const signature = signParams(params, apiSecret);
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  form.set("transformation", transformation);
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error(`Cloudinary upload failed with HTTP ${response.status}`);
  const data = (await response.json()) as {
    public_id?: string;
    secure_url?: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  };
  if (!data.public_id || !data.secure_url) throw new Error("Cloudinary returned an incomplete upload response");

  let result: CloudinaryUploadResult = {
    publicId: data.public_id,
    url: data.secure_url,
    width: data.width ?? null,
    height: data.height ?? null,
    format: data.format ?? null,
    bytes: data.bytes ?? file.size,
  };

  for (const step of COMPRESSION_STEPS.slice(1)) {
    if (result.bytes <= maxBytes) break;
    const eager = await cloudinaryExplicit(result.publicId, step, cloudName, apiKey, apiSecret);
    if (!eager?.secure_url || !eager.bytes) continue;
    result = {
      ...result,
      url: eager.secure_url,
      width: eager.width ?? result.width,
      height: eager.height ?? result.height,
      bytes: eager.bytes,
    };
  }

  if (result.bytes > maxBytes)
    throw new Error(
      `Impossible de compresser cette image sous ${Math.round(maxBytes / 1024 / 1024)} Mo. Essaie une image plus légère.`,
    );

  return result;
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload?public_ids[]=${encodeURIComponent(publicId)}`,
    { method: "DELETE", headers: { Authorization: `Basic ${auth}` } },
  );
  if (!response.ok) throw new Error(`Cloudinary delete failed with HTTP ${response.status}`);
}

export type CloudinaryMediaAsset = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number;
  createdAt: string;
};

export async function listCloudinaryImages(folder: string, maxResults = 200): Promise<CloudinaryMediaAsset[]> {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const prefix = folder.replace(/[^a-zA-Z0-9_\-/]/g, "-");
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image?type=upload&prefix=${encodeURIComponent(prefix + "/")}&max_results=${maxResults}&direction=desc`;
  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!response.ok) throw new Error(`Cloudinary list failed with HTTP ${response.status}`);
  const data = (await response.json()) as {
    resources?: Array<{
      public_id: string;
      secure_url: string;
      width?: number;
      height?: number;
      format?: string;
      bytes?: number;
      created_at?: string;
    }>;
  };
  return (data.resources ?? []).map((resource) => ({
    publicId: resource.public_id,
    url: resource.secure_url,
    width: resource.width ?? null,
    height: resource.height ?? null,
    format: resource.format ?? null,
    bytes: resource.bytes ?? 0,
    createdAt: resource.created_at ?? new Date(0).toISOString(),
  }));
}

/**
 * Musicful v2 — MP3 Only: Musicful's finished file isn't reliably audio-typed (it can come
 * back as `video/mp4`), and there is no ffmpeg/transcoding runtime available in this Vercel
 * deployment. Cloudinary (already wired for image uploads above) fetches the remote provider
 * URL server-side and transcodes it to a genuine MP3 during upload — this is the "cloud
 * transcoding service" strategy documented for serverless deployments. Never used when the
 * source is already verified `audio/mpeg`.
 */
export async function transcodeRemoteAudioToMp3(remoteUrl: string, options?: { folder?: string; publicId?: string }) {
  if (!/^https:\/\//i.test(remoteUrl)) throw new Error("Only https remote URLs can be transcoded");
  const { cloudName, apiKey, apiSecret } = requireCloudinaryEnv();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = (options?.folder || `${process.env.CLOUDINARY_FOLDER || "africa-saas-kit"}/musicful-audio`).replace(
    /[^a-zA-Z0-9_\-/]/g,
    "-",
  );
  const publicId = options?.publicId ? options.publicId.replace(/[^a-zA-Z0-9_\-/]/g, "-") : undefined;
  const params: Record<string, string | number> = {
    folder,
    format: "mp3",
    timestamp,
    ...(publicId ? { public_id: publicId } : {}),
  };
  const signature = signParams(params, apiSecret);

  const form = new FormData();
  form.set("file", remoteUrl);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  form.set("format", "mp3");
  if (publicId) form.set("public_id", publicId);
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const detail = body?.error?.message ? `: ${body.error.message}` : "";
    throw new Error(`Cloudinary audio transcode failed with HTTP ${response.status}${detail}`);
  }
  const data = (await response.json()) as { secure_url?: string; format?: string; bytes?: number };
  if (!data.secure_url) throw new Error("Cloudinary returned an incomplete transcode response");
  if (data.format && data.format.toLowerCase() !== "mp3")
    throw new Error(`Cloudinary returned unexpected format: ${data.format}`);
  return { url: data.secure_url, bytes: data.bytes ?? null };
}

/**
 * Guards `coverUrl` before it becomes publicly visible (see /s/[slug]): only URLs hosted on our
 * own configured Cloudinary account are accepted. A naive host-string check (e.g.
 * `.includes("res.cloudinary.com")`) would accept a lookalike host like
 * `res.cloudinary.com.evil.example`, so this parses the URL and compares the exact hostname; a
 * bare hostname check would still accept any other Cloudinary customer's `cloud_name` (free to
 * create) or the `/image/fetch/` delivery type (which can proxy an arbitrary external URL), so the
 * path is also required to start with `/${CLOUDINARY_CLOUD_NAME}/image/upload/`.
 */
export function isTrustedImageUrl(url: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/image/upload/`)
    );
  } catch {
    return false;
  }
}
