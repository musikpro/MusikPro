import { z } from "zod";

export const overlayLocaleSchema = z.enum(["en", "es", "pt"]);
