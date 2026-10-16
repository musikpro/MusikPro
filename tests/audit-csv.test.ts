import { describe, expect, it } from "vitest";
import { auditRowsToCsv, neutralizeCsvCell } from "@/lib/admin/audit-csv";
import type { AuditRow } from "@/lib/admin/audit-types";

const row = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  id: "a1",
  createdAt: "2026-10-16T03:43:00.000Z",
  actorId: "u1",
  actorName: "Marie Dupont",
  actorEmail: "marie@example.com",
  action: "user.role.changed",
  targetType: "user",
  targetId: "u2",
  ip: "10.0.0.1",
  metadata: { role: "admin" },
  ...overrides,
});

describe("neutralizeCsvCell", () => {
  it("préfixe les cellules qui pourraient être lues comme une formule", () => {
    for (const dangerous of ["=1+1", "+33", "-2", "@SUM(A1)", "\tcmd", "\rcmd"]) {
      expect(neutralizeCsvCell(dangerous).startsWith("'")).toBe(true);
    }
  });
  it("laisse le texte normal tel quel", () => {
    expect(neutralizeCsvCell("user.role.changed")).toBe("user.role.changed");
    expect(neutralizeCsvCell("")).toBe("");
  });
});

describe("auditRowsToCsv", () => {
  it("commence par un BOM UTF-8 et une ligne d'en-têtes française", () => {
    const csv = auditRowsToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n")[0]).toContain("Date (UTC)");
    expect(csv.split("\r\n")[0]).toContain("Action");
  });

  it("écrit une ligne par entrée, avec les métadonnées en JSON", () => {
    const lines = auditRowsToCsv([row()]).split("\r\n");
    expect(lines).toHaveLength(3); // en-têtes, ligne, fin
    expect(lines[1]).toContain("2026-10-16T03:43:00.000Z");
    expect(lines[1]).toContain("marie@example.com");
    expect(lines[1]).toContain('""role"":""admin""');
  });

  it("met entre guillemets les valeurs avec virgule, guillemet ou saut de ligne", () => {
    const csv = auditRowsToCsv([row({ actorName: 'Dupont, "Marie"\nJean' })]);
    expect(csv).toContain('"Dupont, ""Marie""\nJean"');
  });

  it("neutralise une formule injectée dans le nom de l'acteur", () => {
    const csv = auditRowsToCsv([row({ actorName: '=HYPERLINK("http://x")' })]);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
    expect(csv).toContain("'=HYPERLINK");
  });

  it("gère un acteur supprimé ou des champs absents", () => {
    const csv = auditRowsToCsv([
      row({ actorName: null, actorEmail: null, targetType: null, targetId: null, ip: null, metadata: null }),
    ]);
    expect(csv.split("\r\n")[1]).toContain("u1");
  });
});
