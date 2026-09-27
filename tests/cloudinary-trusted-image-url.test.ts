import { describe, expect, it } from "vitest";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";

describe("isTrustedImageUrl", () => {
  it("accepts a real Cloudinary secure URL", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com/demo/image/upload/v1/users/abc/cover.jpg")).toBe(true);
  });

  it("rejects a different host, even if it looks similar", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com.evil.example/x.jpg")).toBe(false);
    expect(isTrustedImageUrl("https://not-cloudinary.example/x.jpg")).toBe(false);
  });

  it("rejects a non-URL string instead of throwing", () => {
    expect(isTrustedImageUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedImageUrl("")).toBe(false);
  });
});
