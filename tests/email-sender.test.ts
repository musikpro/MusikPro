import { describe, expect, it } from "vitest";
import { formatSender } from "@/lib/email";

describe("formatSender", () => {
  it("ajoute le nom du site devant une adresse seule", () => {
    expect(formatSender("noreply@musikpro.net", "MusikPro")).toBe("MusikPro <noreply@musikpro.net>");
  });
  it("conserve un expéditeur qui porte déjà un nom", () => {
    expect(formatSender("Équipe MusikPro <noreply@musikpro.net>", "MusikPro")).toBe(
      "Équipe MusikPro <noreply@musikpro.net>",
    );
  });
  it("neutralise les caractères dangereux du nom", () => {
    expect(formatSender("noreply@musikpro.net", 'Mus<ik>"Pro\r\n')).toBe("MusikPro <noreply@musikpro.net>");
  });
});
