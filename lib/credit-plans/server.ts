import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { plans } from "@/db/schema";
import {
  creditPlanFeaturesSchema,
  DEFAULT_CREDIT_PLANS,
  type CreditPlanOption,
} from "./catalog";

export async function getActiveCreditPlans(options: { demo?: boolean } = {}): Promise<CreditPlanOption[]> {
  try {
    const rows = await db
      .select()
      .from(plans)
      .where(eq(plans.active, true));

    const catalog = rows.flatMap((row) => {
      const features = creditPlanFeaturesSchema.safeParse(row.features);
      if (!features.success) return [];
      return [{
        id: row.id,
        code: row.code,
        name: row.name,
        credits: features.data.credits,
        generationCost: features.data.generationCost,
        priceValue: row.amount,
        currency: row.currency,
        description: row.description || "Crédits de génération MusikPro",
        popular: features.data.popular,
        bonus: features.data.bonus,
        sortOrder: features.data.sortOrder,
        active: row.active,
      }];
    });

    catalog.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "fr"));

    if (catalog.length || !options.demo) return catalog;
  } catch (error) {
    if (!options.demo) throw error;
  }

  return DEFAULT_CREDIT_PLANS;
}
