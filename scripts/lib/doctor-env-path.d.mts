export function resolveDoctorEnvPaths(
  root: string,
  override?: string,
): { baseEnvPath: string; overlayEnvPath: string | null };
export function parseEnvText(text: string): Record<string, string>;
export function mergeEnv(base: Record<string, string>, overlay: Record<string, string>): Record<string, string>;
