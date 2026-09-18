import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).optional().nullable(),
  phone: optionalText(40),
  company: optionalText(120),
  notes: optionalText(2000),
});

export const clientUpdateSchema = clientCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

export const clientIdSchema = z.string().trim().min(1).max(64);
