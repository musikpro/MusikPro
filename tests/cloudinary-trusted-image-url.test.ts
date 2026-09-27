import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";

describe("isTrustedImageUrl", () => {
  const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
  });

  afterEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
  });

  it("accepts a real Cloudinary secure URL for the configured cloud name", () => {
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

  it("rejects a URL hosted under a different Cloudinary account (wrong cloud name)", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com/some-other-cloud/image/upload/v1/x.jpg")).toBe(false);
  });

  it("rejects the fetch delivery type, which can proxy an arbitrary external URL", () => {
    expect(isTrustedImageUrl("https://res.cloudinary.com/demo/image/fetch/https://evil.example/x.jpg")).toBe(false);
  });
});
