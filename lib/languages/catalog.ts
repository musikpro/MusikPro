export type LanguageOption = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

export type LanguageCatalog = {
  interfaceLanguages: LanguageOption[];
  lyricsLanguages: LanguageOption[];
};

export const DEFAULT_LANGUAGES: Array<LanguageOption & { interfaceEnabled: boolean; lyricsEnabled: boolean }> = [
  {
    id: "language-fr",
    code: "fr",
    name: "Français",
    nativeName: "Français",
    flag: "🇫🇷",
    interfaceEnabled: true,
    lyricsEnabled: true,
  },
  {
    id: "language-en",
    code: "en",
    name: "Anglais",
    nativeName: "English",
    flag: "🇬🇧",
    interfaceEnabled: true,
    lyricsEnabled: true,
  },
  {
    id: "language-es",
    code: "es",
    name: "Espagnol",
    nativeName: "Español",
    flag: "🇪🇸",
    interfaceEnabled: true,
    lyricsEnabled: true,
  },
  {
    id: "language-pt",
    code: "pt",
    name: "Portugais",
    nativeName: "Português",
    flag: "🇵🇹",
    interfaceEnabled: true,
    lyricsEnabled: true,
  },
];
