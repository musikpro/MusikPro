import type { CatalogTranslations } from "@/lib/i18n/translate";

export type PhonePrefixOption = {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  digits: number;
  placeholder: string;
  translations?: CatalogTranslations | null;
};

export const DEFAULT_PHONE_PREFIXES: PhonePrefixOption[] = [
  { id: "default-ci", countryCode: "CI", countryName: "Côte d’Ivoire", flag: "🇨🇮", dialCode: "+225", digits: 10, placeholder: "0708807015" },
  { id: "default-sn", countryCode: "SN", countryName: "Sénégal", flag: "🇸🇳", dialCode: "+221", digits: 9, placeholder: "771234567" },
  { id: "default-ml", countryCode: "ML", countryName: "Mali", flag: "🇲🇱", dialCode: "+223", digits: 8, placeholder: "70123456" },
  { id: "default-bf", countryCode: "BF", countryName: "Burkina Faso", flag: "🇧🇫", dialCode: "+226", digits: 8, placeholder: "70123456" },
  { id: "default-ne", countryCode: "NE", countryName: "Niger", flag: "🇳🇪", dialCode: "+227", digits: 8, placeholder: "90123456" },
  { id: "default-gh", countryCode: "GH", countryName: "Ghana", flag: "🇬🇭", dialCode: "+233", digits: 9, placeholder: "241234567" },
  { id: "default-ng", countryCode: "NG", countryName: "Nigeria", flag: "🇳🇬", dialCode: "+234", digits: 10, placeholder: "8012345678" },
  { id: "default-fr", countryCode: "FR", countryName: "France", flag: "🇫🇷", dialCode: "+33", digits: 9, placeholder: "612345678" },
];
