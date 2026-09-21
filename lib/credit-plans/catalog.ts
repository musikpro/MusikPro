import { z } from "zod";

export const CREDITS_PER_GENERATION = 2;
export const VERSIONS_PER_GENERATION = 2;

export type CreditPlanOption = {
  id: string;
  code: string;
  name: string;
  credits: number;
  generationCost: number;
  priceValue: number;
  currency: string;
  description: string;
  popular: boolean;
  bonus: string | null;
  sortOrder: number;
  active: boolean;
};

export const creditPlanFeaturesSchema = z.object({
  credits: z.number().int().min(CREDITS_PER_GENERATION).max(100_000),
  generationCost: z.literal(CREDITS_PER_GENERATION).default(CREDITS_PER_GENERATION),
  popular: z.boolean().default(false),
  bonus: z.string().trim().max(120).nullable().default(null),
  sortOrder: z.number().int().min(0).max(999).default(100),
});

export const DEFAULT_CREDIT_PLANS: CreditPlanOption[] = [
  {
    id: "credits-decouverte-5",
    code: "credits-5",
    name: "Découverte",
    credits: 5,
    generationCost: CREDITS_PER_GENERATION,
    priceValue: 1_000,
    currency: "XOF",
    description: "2 générations, soit jusqu’à 4 versions musicales",
    popular: false,
    bonus: "1 crédit restant",
    sortOrder: 10,
    active: true,
  },
  {
    id: "credits-essentiel-10",
    code: "credits-10",
    name: "Essentiel",
    credits: 10,
    generationCost: CREDITS_PER_GENERATION,
    priceValue: 2_000,
    currency: "XOF",
    description: "5 générations, soit jusqu’à 10 versions musicales",
    popular: false,
    bonus: null,
    sortOrder: 20,
    active: true,
  },
  {
    id: "credits-populaire-20",
    code: "credits-20",
    name: "Populaire",
    credits: 20,
    generationCost: CREDITS_PER_GENERATION,
    priceValue: 3_500,
    currency: "XOF",
    description: "10 générations, soit jusqu’à 20 versions musicales",
    popular: true,
    bonus: "Meilleur rapport crédits-prix",
    sortOrder: 30,
    active: true,
  },
  {
    id: "credits-studio-50",
    code: "credits-50",
    name: "Studio",
    credits: 50,
    generationCost: CREDITS_PER_GENERATION,
    priceValue: 7_500,
    currency: "XOF",
    description: "25 générations, soit jusqu’à 50 versions musicales",
    popular: false,
    bonus: "Pour les créateurs réguliers",
    sortOrder: 40,
    active: true,
  },
];

export function getGenerationCount(credits: number, cost = CREDITS_PER_GENERATION) {
  return Math.floor(credits / cost);
}

export function getVersionCount(credits: number, cost = CREDITS_PER_GENERATION) {
  return getGenerationCount(credits, cost) * VERSIONS_PER_GENERATION;
}
