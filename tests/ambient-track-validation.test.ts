import { describe, expect, it } from "vitest";
import { setAmbientTrackSchema } from "@/lib/validation/ambient-track";

describe("setAmbientTrackSchema", () => {
  it("accepte une chanson choisie et un volume dans les bornes", () => {
    const result = setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: "20" });
    expect(result).toEqual({ songGroupId: "grp_1", volumePercent: 20 });
  });

  it("rejette un songGroupId vide", () => {
    expect(() => setAmbientTrackSchema.parse({ songGroupId: "", volumePercent: "20" })).toThrow();
  });

  it.each([0, -1, 51, 100, -5])("rejette un volumePercent hors bornes : %d", (volumePercent) => {
    expect(() => setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: String(volumePercent) })).toThrow();
  });

  it.each([1, 5, 20, 50])("accepte un volumePercent aux bornes ou au milieu : %d", (volumePercent) => {
    const result = setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: String(volumePercent) });
    expect(result.volumePercent).toBe(volumePercent);
  });

  it("rejette un volumePercent non numérique", () => {
    expect(() => setAmbientTrackSchema.parse({ songGroupId: "grp_1", volumePercent: "abc" })).toThrow();
  });
});
