import type { AuditRow } from "./audit-types";

const HEADERS = [
  "Date (UTC)",
  "Identifiant acteur",
  "Nom acteur",
  "E-mail acteur",
  "Action",
  "Type de cible",
  "Cible",
  "Adresse IP",
  "Détails (JSON)",
] as const;

/**
 * Un tableur interprète une cellule commençant par = + - @ (ou une tabulation / un retour chariot) comme une
 * formule : on la préfixe d'une apostrophe pour qu'elle reste du texte (injection CSV).
 */
export function neutralizeCsvCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCell(value: string): string {
  const safe = neutralizeCsvCell(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function metadataCell(metadata: unknown): string {
  if (metadata === null || metadata === undefined) return "";
  try {
    return JSON.stringify(metadata);
  } catch {
    return "";
  }
}

/** CSV UTF-8 avec BOM (Excel) et fins de ligne CRLF, une ligne par entrée du journal. */
export function auditRowsToCsv(rows: readonly AuditRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.createdAt,
        row.actorId ?? "",
        row.actorName ?? "",
        row.actorEmail ?? "",
        row.action,
        row.targetType ?? "",
        row.targetId ?? "",
        row.ip ?? "",
        metadataCell(row.metadata),
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
