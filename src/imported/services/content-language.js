/** Resolve a requested language to content available in the current learning catalogue. */
export function resolveContentLanguage(language, fallback = "fi") {
    return language === "fi" || language === "es" || language === "en" ? language : fallback;
}
