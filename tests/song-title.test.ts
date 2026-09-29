import { expect, test } from "vitest";
import { buildSongTitle, stripVersionSuffix, withVersionSuffix } from "../lib/ai/song-title";

test("song title: recipient, occasion, style, month and year, then version", () => {
  const base = buildSongTitle({ recipientName: "Aïcha", occasion: "Anniversaire", genre: "Zouk", date: new Date("2026-09-29T10:00:00Z") });
  expect(base).toBe("Aïcha — Anniversaire — Zouk — septembre 2026");
  expect(withVersionSuffix(base, 2)).toBe("Aïcha — Anniversaire — Zouk — septembre 2026 — Version 2");
  expect(stripVersionSuffix(withVersionSuffix(base, 1))).toBe(base);
});

test("song title: missing recipient name is skipped", () => {
  const base = buildSongTitle({ recipientName: " ", occasion: "Mariage", genre: "Afrobeat", date: new Date("2026-01-15T10:00:00Z") });
  expect(base).toBe("Mariage — Afrobeat — janvier 2026");
});
