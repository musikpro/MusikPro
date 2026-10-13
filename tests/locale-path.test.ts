import { describe, expect, it } from "vitest";
import { splitLocalePrefix, stripLocalePrefix, unprefixedPublicPath, withLocalePrefix } from "@/lib/languages/locale-path";

describe("locale-path", () => {
  it("reconnaît le préfixe sur la landing, le dashboard et la démo", () => {
    expect(splitLocalePrefix("/fr")).toEqual({ locale: "fr", path: "/" });
    expect(splitLocalePrefix("/en/")).toEqual({ locale: "en", path: "/" });
    expect(splitLocalePrefix("/pt/dashboard")).toEqual({ locale: "pt", path: "/dashboard" });
    expect(splitLocalePrefix("/es/dashboard/songs/12")).toEqual({ locale: "es", path: "/dashboard/songs/12" });
    expect(splitLocalePrefix("/en/demo/create")).toEqual({ locale: "en", path: "/demo/create" });
  });

  it("n'altère jamais les autres routes", () => {
    for (const path of [
      "/",
      "/dashboard",
      "/admin/languages",
      "/api/health",
      "/s/abc",
      "/login",
      "/en/login",
      "/api",
    ]) {
      expect(splitLocalePrefix(path)).toEqual({ locale: null, path });
    }
    expect(splitLocalePrefix("/en/admin")).toEqual({ locale: null, path: "/en/admin" });
    expect(splitLocalePrefix("/english")).toEqual({ locale: null, path: "/english" });
  });

  it("ajoute, remplace et retire le préfixe", () => {
    expect(withLocalePrefix("/", "en")).toBe("/en");
    expect(withLocalePrefix("/dashboard/songs", "pt")).toBe("/pt/dashboard/songs");
    expect(withLocalePrefix("/fr/dashboard/songs", "en")).toBe("/en/dashboard/songs");
    expect(withLocalePrefix("/fr", "en")).toBe("/en");
    expect(stripLocalePrefix("/en/dashboard/credits")).toBe("/dashboard/credits");
    expect(stripLocalePrefix("/dashboard")).toBe("/dashboard");
  });
});

describe("unprefixedPublicPath", () => {
  it.each([
    ["/fr/login", "/login"],
    ["/en/register", "/register"],
    ["/pt/forgot-password", "/forgot-password"],
    ["/es/reset-password", "/reset-password"],
    ["/fr/terms", "/terms"],
    ["/en/privacy/", "/privacy"],
  ])("%s redirige vers %s", (input, expected) => {
    expect(unprefixedPublicPath(input)).toBe(expected);
  });

  it.each(["/login", "/fr", "/fr/dashboard", "/fr/demo/credits", "/api/login", "/fr/login/x", "/fr/admin", "/s/login"])(
    "%s n'est pas redirigé",
    (input) => {
      expect(unprefixedPublicPath(input)).toBeNull();
    },
  );
});
