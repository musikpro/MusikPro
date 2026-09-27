import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";

describe("Upload d'image — messages en français", () => {
  it("n'a plus de message d'erreur en anglais", async () => {
    const source = await fs.readFile("app/api/uploads/images/route.ts", "utf8");
    expect(source).not.toContain('"Unauthorized"');
    expect(source).not.toContain('"Too many upload requests"');
    expect(source).not.toContain('"Cloudinary is not enabled"');
    expect(source).not.toContain('"Image file is required"');
    expect(source).not.toContain('"Image upload failed"');
  });
});
