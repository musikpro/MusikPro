import { z } from "zod";

export const MAINTENANCE_MESSAGE_MAX = 500;

/** Formulaire /admin/maintenance : interrupteur + message optionnel affiché aux visiteurs. */
export const maintenanceFormSchema = z
  .object({
    enable: z.enum(["true", "false"]),
    message: z
      .string()
      .trim()
      .max(MAINTENANCE_MESSAGE_MAX, "Le message est trop long (500 caractères maximum).")
      .optional(),
  })
  .transform((value) => ({
    enable: value.enable === "true",
    message: value.message ? value.message : null,
  }));

export type MaintenanceForm = z.output<typeof maintenanceFormSchema>;
