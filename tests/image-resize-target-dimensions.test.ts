import { describe, expect, it } from "vitest";
import { computeTargetDimensions } from "@/lib/demo/image-resize";

describe("computeTargetDimensions", () => {
  it("laisse une image déjà plus petite que la limite inchangée", () => {
    expect(computeTargetDimensions(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it("réduit une image plus large que haute en conservant le ratio", () => {
    expect(computeTargetDimensions(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
  });

  it("réduit une image plus haute que large en conservant le ratio", () => {
    expect(computeTargetDimensions(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("gère une image carrée exactement à la limite", () => {
    expect(computeTargetDimensions(2000, 2000, 2000)).toEqual({ width: 2000, height: 2000 });
  });

  it("arrondit les dimensions calculées à l'entier le plus proche", () => {
    expect(computeTargetDimensions(3001, 2000, 2000)).toEqual({ width: 2000, height: 1333 });
  });
});
