import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
import { sendAuthEmail, sendTwoFactorEmail } from "@/lib/email";

const input = {
  to: "test@example.invalid",
  subject: "Test",
  title: "Test",
  actionUrl: "https://example.invalid/verify?token=private",
  actionLabel: "Vérifier",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  send.mockReset();
});

describe("transactional authentication email", () => {
  it("rejects a provider error without exposing its payload or verification token", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-placeholder");
    vi.stubEnv("EMAIL_FROM", "MusikPro <test@example.invalid>");
    send.mockResolvedValue({
      data: null,
      error: { message: "sensitive provider payload" },
    });
    await expect(sendAuthEmail(input)).rejects.toThrow(
      "Transactional email delivery failed",
    );
  });
  it("accepts an email only when the provider returns an id", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-placeholder");
    vi.stubEnv("EMAIL_FROM", "MusikPro <test@example.invalid>");
    send.mockResolvedValue({ data: { id: "test-id" }, error: null });
    await expect(sendAuthEmail(input)).resolves.toBeUndefined();
  });
  it("fails closed in production when credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendAuthEmail(input)).rejects.toThrow(
      "Transactional email is not configured in production",
    );
    expect(send).not.toHaveBeenCalled();
  });
  it("sends a two-factor code without logging it", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only-placeholder");
    vi.stubEnv("EMAIL_FROM", "MusikPro <test@example.invalid>");
    send.mockResolvedValue({ data: { id: "test-id" }, error: null });
    await expect(sendTwoFactorEmail({ to: input.to, code: "123456" })).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: input.to }));
  });
});
