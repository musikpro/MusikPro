import { describe, expect, it } from "vitest";

// This is a static regression guard because uploadImageToCloudinary intentionally
// requires live Cloudinary credentials before the network upload step.
describe("Cloudinary image validation", () => {
  it("keeps magic-byte validation in the storage adapter", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/storage/cloudinary.ts", "utf8"));
    expect(source).toContain("detectImageType");
    expect(source).toContain("Image content does not match its declared MIME type");
    expect(source).toContain("image/avif");
  });
});
