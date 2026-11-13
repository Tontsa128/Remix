import { STARTER_PHRASES } from "../content/initial-phrases";

export const LESSON_THEMES = [
  { id: "basics", prefixes: ["greeting-", "question-", "introduction-", "politeness-", "farewell-"], labelKey: "themeBasics" },
  { id: "communication", prefixes: ["communication-", "help-"], labelKey: "themeCommunication" },
  { id: "travel", prefixes: ["travel-"], labelKey: "themeTravel" },
  { id: "food", prefixes: ["food-"], labelKey: "themeFood" },
  { id: "shopping", prefixes: ["shopping-", "payment-"], labelKey: "themeShopping" },
] as const;

export type LessonThemeId = (typeof LESSON_THEMES)[number]["id"];

export function getThemePhraseIds(themeId: string): string[] {
  const theme = LESSON_THEMES.find((item) => item.id === themeId);
  if (!theme) return [];
  return STARTER_PHRASES
    .filter((phrase) => theme.prefixes.some((prefix) => phrase.id.startsWith(prefix)))
    .map((phrase) => phrase.id);
}

export function getUnassignedPhraseIds(): string[] {
  return STARTER_PHRASES
    .filter((phrase) => !LESSON_THEMES.some((theme) =>
      theme.prefixes.some((prefix) => phrase.id.startsWith(prefix)),
    ))
    .map((phrase) => phrase.id);
}
