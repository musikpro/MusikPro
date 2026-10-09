import { z } from "zod";

const versionHash = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{64}$/, "identifiant de version invalide");

export const replicateVersionTargetSchema = z.object({ version: versionHash });

export const replicateVersionValidateSchema = z.object({
  version: versionHash,
  /** Paid probe: only when the owner ticked the consent box. */
  runPaidProbe: z.boolean(),
});

export const replicateVersionActivateSchema = z.object({ version: versionHash, expectedActive: versionHash });

export const replicateVersionRollbackSchema = z.object({ expectedActive: versionHash });
