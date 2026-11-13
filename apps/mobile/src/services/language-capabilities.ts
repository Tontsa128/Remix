import { LANGUAGES, type LanguageCode } from "../config/languages";

export type LanguageFeature =
  | "interface"
  | "curatedLearningContent"
  | "textTranslation"
  | "speechRecognition"
  | "speechSynthesis"
  | "ocr";

export type LanguageCapability = Readonly<
  Record<LanguageFeature, boolean>
>;

/**
 * Only verified, currently implemented capabilities are enabled here.
 * Static phrase translations count as curated learning content, not as a
 * general-purpose translation service.
 */
const capabilities: Readonly<Record<LanguageCode, LanguageCapability>> = {
  fi: {
    interface: true,
    curatedLearningContent: true,
    textTranslation: false,
    speechRecognition: false,
    speechSynthesis: false,
    ocr: false,
  },
  es: {
    interface: true,
    curatedLearningContent: true,
    textTranslation: false,
    speechRecognition: false,
    speechSynthesis: false,
    ocr: false,
  },
  en: {
    interface: true,
    curatedLearningContent: true,
    textTranslation: false,
    speechRecognition: false,
    speechSynthesis: false,
    ocr: false,
  },
};

export function getLanguageCapability(
  language: LanguageCode,
): LanguageCapability | undefined {
  if (!LANGUAGES.some((item) => item.code === language)) return undefined;
  return capabilities[language];
}

export function isLanguageFeatureAvailable(
  language: LanguageCode,
  feature: LanguageFeature,
): boolean {
  return getLanguageCapability(language)?.[feature] === true;
}

/**
 * Interpretation requires all three real service capabilities:
 * source ASR, source-to-target translation, and target TTS.
 */
export function isSpeechInterpretationPairAvailable(
  source: LanguageCode,
  target: LanguageCode,
): boolean {
  if (source === target) return false;
  return (
    isLanguageFeatureAvailable(source, "speechRecognition") &&
    isLanguageFeatureAvailable(source, "textTranslation") &&
    isLanguageFeatureAvailable(target, "speechSynthesis")
  );
}
