import fs from "node:fs";
import path from "node:path";

export type DoctorResult = { id:string; label:string; status:"PASS"|"WARN"|"FAIL"|"UNVERIFIED"; detail:string; category:string };
export type DoctorReport = { version:string; online:boolean; score:number; verdict:string; generatedAt:string; results:DoctorResult[] };

export function readDoctorReport(): DoctorReport | null {
  const p=path.join(process.cwd(),"generated/production-doctor.json");
  if(!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p,"utf8")); } catch { return null; }
}
