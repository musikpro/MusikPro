import fs from "node:fs";
import path from "node:path";

export type SecuritySaasStatus = "pass" | "warn" | "fail";
export type SecuritySaasReport = {
  generatedAt: string;
  mode: "static" | "online";
  score: number;
  rank: string;
  summary: { pass: number; warn: number; fail: number; total: number; scannedFiles: number };
  checks: Array<{ id: string; label: string; status: SecuritySaasStatus; detail: string }>;
};

export function getSecuritySaasReport(): SecuritySaasReport | null {
  const file = path.join(process.cwd(), "generated/security-saas-report.json");
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as SecuritySaasReport;
    if (!Number.isFinite(data.score) || !Array.isArray(data.checks)) return null;
    return data;
  } catch {
    return null;
  }
}
