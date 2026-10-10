import { describe, expect, it } from "vitest";
import { clampPage, pageCount, pageRange, pageWindow } from "@/lib/admin/pagination";
import {
  GENERATIONS_PER_PAGE_DEFAULT,
  USERS_PER_PAGE_DEFAULT,
  normalizeGenerationsPerPage,
  normalizeUsersPerPage,
} from "@/lib/settings/admin-display-constants";

describe("pagination", () => {
  it("calcule le nombre de pages", () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(50, 50)).toBe(1);
    expect(pageCount(51, 50)).toBe(2);
  });
  it("ramène la page dans les bornes", () => {
    expect(clampPage(0, 120, 50)).toBe(1);
    expect(clampPage(99, 120, 50)).toBe(3);
    expect(clampPage(Number.NaN, 120, 50)).toBe(1);
  });
  it("donne la plage affichée", () => {
    expect(pageRange(2, 50, 120)).toEqual({ from: 51, to: 100 });
    expect(pageRange(3, 50, 120)).toEqual({ from: 101, to: 120 });
    expect(pageRange(1, 50, 0)).toEqual({ from: 0, to: 0 });
  });
  it("construit la fenêtre de numéros", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(pageWindow(1, 10)).toEqual([1, 2, "gap", 10]);
    expect(pageWindow(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(pageWindow(10, 10)).toEqual([1, "gap", 9, 10]);
  });
});

describe("normalizeGenerationsPerPage", () => {
  it("garde 50 par défaut et borne les valeurs", () => {
    expect(normalizeGenerationsPerPage(undefined)).toBe(GENERATIONS_PER_PAGE_DEFAULT);
    expect(normalizeGenerationsPerPage("abc")).toBe(GENERATIONS_PER_PAGE_DEFAULT);
    expect(normalizeGenerationsPerPage(5)).toBe(10);
    expect(normalizeGenerationsPerPage(9999)).toBe(200);
    expect(normalizeGenerationsPerPage(25)).toBe(25);
  });
});

describe("normalizeUsersPerPage", () => {
  it("garde 50 par défaut et borne les valeurs", () => {
    expect(normalizeUsersPerPage(undefined)).toBe(USERS_PER_PAGE_DEFAULT);
    expect(normalizeUsersPerPage("x")).toBe(USERS_PER_PAGE_DEFAULT);
    expect(normalizeUsersPerPage(3)).toBe(10);
    expect(normalizeUsersPerPage(5000)).toBe(200);
    expect(normalizeUsersPerPage(30)).toBe(30);
  });
});
