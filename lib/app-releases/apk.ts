import { inflateRawSync } from "node:zlib";
import { APP_PACKAGE_NAME } from "./constants";

export type ApkInspection = { ok: true } | { ok: false; reason: string };

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIR = 0x06054b50;
const MAX_ENTRIES = 20_000;
/** Un manifeste Android fait quelques Ko : au-delà, on refuse (archive piégée). */
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;

type ZipEntry = { name: string; method: number; compressedSize: number; uncompressedSize: number; localOffset: number };

/** Lit l'annuaire central d'une archive ZIP. Renvoie null si l'archive est illisible ou incohérente. */
function readEntries(buffer: Buffer): ZipEntry[] | null {
  const searchFrom = Math.max(0, buffer.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= searchFrom; i -= 1) {
    if (buffer.readUInt32LE(i) === END_OF_CENTRAL_DIR) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const total = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (total === 0 || total > MAX_ENTRIES || directoryOffset + directorySize > buffer.length) return null;

  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < total; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL_HEADER) return null;
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    if (cursor + 46 + nameLength > buffer.length) return null;
    entries.push({
      name: buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength),
      method: buffer.readUInt16LE(cursor + 10),
      compressedSize: buffer.readUInt32LE(cursor + 20),
      uncompressedSize: buffer.readUInt32LE(cursor + 24),
      localOffset: buffer.readUInt32LE(cursor + 42),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function readEntryData(buffer: Buffer, entry: ZipEntry): Buffer | null {
  if (entry.uncompressedSize > MAX_MANIFEST_BYTES) return null;
  const header = entry.localOffset;
  if (header + 30 > buffer.length || buffer.readUInt32LE(header) !== LOCAL_HEADER) return null;
  const start = header + 30 + buffer.readUInt16LE(header + 26) + buffer.readUInt16LE(header + 28);
  const end = start + entry.compressedSize;
  if (end > buffer.length) return null;
  const raw = buffer.subarray(start, end);
  try {
    if (entry.method === 0) return raw;
    if (entry.method === 8) return inflateRawSync(raw, { maxOutputLength: MAX_MANIFEST_BYTES });
  } catch {
    return null;
  }
  return null;
}

/** Vrai si `needle` apparaît dans `haystack` en UTF-8 ou en UTF-16LE (les deux encodages du manifeste binaire Android). */
function containsText(haystack: Buffer, needle: string): boolean {
  return haystack.includes(Buffer.from(needle, "utf8")) || haystack.includes(Buffer.from(needle, "utf16le"));
}

/**
 * Contrôle qu'un fichier est bien un APK de MusikPro : archive ZIP valide, `AndroidManifest.xml` et `classes.dex`
 * présents, nom de paquet attendu dans le manifeste, bloc de signature Android présent (APK signé). N'exécute ni ne
 * décompresse rien d'autre que le manifeste, borné en taille.
 */
export function inspectApk(buffer: Buffer): ApkInspection {
  if (buffer.length < 1024 || buffer.readUInt32LE(0) !== LOCAL_HEADER) {
    return { ok: false, reason: "Ce fichier n'est pas une archive d'application Android (APK)." };
  }
  const entries = readEntries(buffer);
  if (!entries) return { ok: false, reason: "L'archive est illisible ou corrompue." };

  const manifest = entries.find((entry) => entry.name === "AndroidManifest.xml");
  if (!manifest || !entries.some((entry) => entry.name === "classes.dex")) {
    return { ok: false, reason: "Ce fichier ne ressemble pas à un APK (manifeste ou code manquant)." };
  }
  const manifestData = readEntryData(buffer, manifest);
  if (!manifestData || !containsText(manifestData, APP_PACKAGE_NAME)) {
    return { ok: false, reason: `Ce fichier n'est pas l'application ${APP_PACKAGE_NAME}.` };
  }
  if (!buffer.includes("APK Sig Block 42")) {
    return { ok: false, reason: "L'APK n'est pas signé : Android refuserait de l'installer." };
  }
  return { ok: true };
}
