import { describe, expect, it } from "vitest";
import { extractGuestTracking } from "@/lib/guest/tracking";

const params = (query: string) => new URL(`https://musikpro.net/g/pub?${query}`).searchParams;

describe("extractGuestTracking", () => {
  it("garde les utm utiles, bornés et nettoyés", () => {
    const tracking = extractGuestTracking(
      params("utm_source=facebook&utm_medium=cpc&utm_campaign=Octobre%20Amour&utm_content=video-1&utm_term=chanson"),
      null,
    );
    expect(tracking).toEqual({
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "Octobre Amour",
      utm_content: "video-1",
      utm_term: "chanson",
    });
  });

  it("ignore les paramètres inconnus et ne stocke jamais d'identifiant de clic (indique seulement sa présence)", () => {
    const tracking = extractGuestTracking(
      params("fbclid=ABC123&ttclid=XYZ&gclid=Q&email=a%40b.c&utm_source=tiktok"),
      null,
    );
    expect(tracking).toEqual({ utm_source: "tiktok", click_id: true });
    expect(JSON.stringify(tracking)).not.toContain("ABC123");
    expect(JSON.stringify(tracking)).not.toContain("a@b.c");
  });

  it("supprime une valeur trop longue ou contenant des caractères dangereux", () => {
    const tracking = extractGuestTracking(
      params(`utm_source=${"a".repeat(81)}&utm_medium=%3Cscript%3E&utm_campaign=ok`),
      null,
    );
    expect(tracking).toEqual({ utm_campaign: "ok" });
  });

  it("retient seulement le domaine du référent", () => {
    expect(
      extractGuestTracking(params(""), "https://l.facebook.com/l.php?u=https%3A%2F%2Fexemple.com&h=secret"),
    ).toEqual({
      referrer_host: "l.facebook.com",
    });
    expect(extractGuestTracking(params(""), "pas une url")).toEqual({});
    expect(extractGuestTracking(params(""), "javascript:alert(1)")).toEqual({});
    expect(extractGuestTracking(params(""), null)).toEqual({});
  });
});
