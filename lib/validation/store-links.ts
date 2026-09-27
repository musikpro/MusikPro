import { z } from "zod";

const storeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https:\/\//i.test(value), "L'URL doit commencer par https://");

export const setStoreLinksSchema = z.object({
  googlePlayUrl: storeUrl,
  appStoreUrl: storeUrl,
});
