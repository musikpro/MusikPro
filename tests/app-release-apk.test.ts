import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { inspectApk } from "@/lib/app-releases/apk";

type Item = { name: string; data: Buffer; deflate?: boolean };

/** Fabrique une archive ZIP minimale valide (suffisante pour tester l'inspecteur). */
function zip(items: Item[], opts: { signed?: boolean; pad?: number } = {}): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const item of items) {
    const name = Buffer.from(item.name);
    const body = item.deflate ? deflateRawSync(item.data) : item.data;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(item.deflate ? 8 : 0, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(item.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, body);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(item.deflate ? 8 : 0, 10);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(item.data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += local.length + name.length + body.length;
  }
  if (opts.signed) {
    const block = Buffer.from("APK Sig Block 42");
    chunks.push(block);
    offset += block.length;
  }
  if (opts.pad) {
    chunks.push(Buffer.alloc(opts.pad));
    offset += opts.pad;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(items.length, 8);
  end.writeUInt16LE(items.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, directory, end]);
}

const manifestUtf16 = Buffer.concat([Buffer.alloc(8), Buffer.from("com.musikpro.app", "utf16le")]);
const dex = Buffer.from("dex\n035");
const good = (extra: Partial<{ signed: boolean }> = {}) =>
  zip(
    [
      { name: "AndroidManifest.xml", data: manifestUtf16, deflate: true },
      { name: "classes.dex", data: dex },
    ],
    { signed: true, pad: 1100, ...extra },
  );

describe("inspectApk", () => {
  it("accepte un APK de MusikPro signé", () => {
    expect(inspectApk(good())).toEqual({ ok: true });
  });

  it("accepte un nom de paquet en UTF-8 et un manifeste non compressé", () => {
    const apk = zip(
      [
        { name: "AndroidManifest.xml", data: Buffer.from("xx com.musikpro.app xx") },
        { name: "classes.dex", data: dex },
      ],
      { signed: true, pad: 1100 },
    );
    expect(inspectApk(apk)).toEqual({ ok: true });
  });

  it("refuse un fichier qui n'est pas une archive", () => {
    expect(inspectApk(Buffer.alloc(5000, 7)).ok).toBe(false);
    expect(inspectApk(Buffer.from("MZ" + "x".repeat(2000))).ok).toBe(false);
    expect(inspectApk(Buffer.alloc(10)).ok).toBe(false);
  });

  it("refuse une archive sans manifeste ou sans code", () => {
    const noManifest = zip([{ name: "classes.dex", data: dex }], { signed: true, pad: 1100 });
    const noDex = zip([{ name: "AndroidManifest.xml", data: manifestUtf16 }], { signed: true, pad: 1100 });
    expect(inspectApk(noManifest).ok).toBe(false);
    expect(inspectApk(noDex).ok).toBe(false);
  });

  it("refuse l'APK d'une autre application", () => {
    const other = zip(
      [
        { name: "AndroidManifest.xml", data: Buffer.from("com.autre.app", "utf16le"), deflate: true },
        { name: "classes.dex", data: dex },
      ],
      { signed: true, pad: 1100 },
    );
    const result = inspectApk(other);
    expect(result.ok).toBe(false);
  });

  it("refuse un APK non signé", () => {
    const result = inspectApk(good({ signed: false }));
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("pas signé") });
  });

  it("refuse une archive dont l'annuaire est corrompu", () => {
    const apk = good();
    apk.writeUInt32LE(0xffffffff, apk.length - 6); // décalage de l'annuaire hors fichier
    expect(inspectApk(apk).ok).toBe(false);
  });
});
