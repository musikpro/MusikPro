import { z } from "zod";

export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(COUPON_CODE_PATTERN, "3 à 32 caractères : lettres, chiffres, - ou _.");
