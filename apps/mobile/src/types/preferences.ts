import type { LanguageCode } from "../config/languages";

export type UserLanguagePreferences = {
  /** Language used for navigation, labels, and system messages. */
  interfaceLanguage: LanguageCode;
  /** Language used for explanations and learning support. */
  nativeLanguage: LanguageCode;
  /** Language the user is actively learning. */
  learningLanguage: LanguageCode;
  /** Source language for the next interpretation session. */
  interpretationSourceLanguage: LanguageCode;
  /** Target language for the next interpretation session. */
  interpretationTargetLanguage: LanguageCode;
};
