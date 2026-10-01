import { z } from "zod";

const storeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https:\/\//i.test(value), "L'URL doit commencer par https://");

export const setStoreLinksSchema = z.object({
  googlePlayUrl: storeUrl,
  appStoreUrl: storeUrl,
  // Case à cocher : absente du FormData quand elle est décochée.
  hideInApp: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});
