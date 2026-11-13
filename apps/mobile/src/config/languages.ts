/** BCP-47 language tag. New languages can be registered without changing app logic. */
export type LanguageCode = string;

export type LanguageDefinition = {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  flag: string;
};

export const LANGUAGES: readonly LanguageDefinition[] = [
  { code: "fi", nativeName: "Suomi", englishName: "Finnish", flag: "🇫🇮" },
  { code: "es", nativeName: "Español", englishName: "Spanish", flag: "🇪🇸" },
  { code: "en", nativeName: "English", englishName: "English", flag: "🇬🇧" },
] as const;

export const DEFAULT_LANGUAGE_PREFERENCES = {
  interfaceLanguage: "fi",
  nativeLanguage: "fi",
  learningLanguage: "es",
  interpretationSourceLanguage: "es",
  interpretationTargetLanguage: "fi",
} as const satisfies Record<string, LanguageCode>;
