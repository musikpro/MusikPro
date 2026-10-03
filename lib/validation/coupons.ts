import { z } from "zod";
import { i18nKey } from "@/lib/i18n/key";

export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(COUPON_CODE_PATTERN, i18nKey("3 à 32 caractères : lettres, chiffres, - ou _."));
