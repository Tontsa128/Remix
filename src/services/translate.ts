import { translateText as offlineFallbackTranslate } from "@/lib/translation-engine";
import type { LanguageCode } from "@/types/elovio";

export async function translatePhrase(params: {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
}): Promise<{ translatedText: string; usedOfflineFallback: boolean }> {
  const clean = params.text.trim();
  if (!clean) {
    throw new Error("Kirjoita tai sanele käännettävä teksti.");
  }
  if (params.from === params.to) {
    return { translatedText: clean, usedOfflineFallback: false };
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        from: params.from,
        to: params.to,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { translatedText?: string };
      if (data.translatedText?.trim()) {
        return {
          translatedText: data.translatedText.trim(),
          usedOfflineFallback: false,
        };
      }
    }
  } catch {
    // Fall back to local curated phrase matching below if unreachable
  }

  const localResult = await offlineFallbackTranslate(
    clean,
    params.from,
    params.to,
  );
  if (
    localResult &&
    localResult.trim() &&
    localResult.trim().toLowerCase() !== clean.toLowerCase()
  ) {
    return {
      translatedText: localResult.trim(),
      usedOfflineFallback: true,
    };
  }

  throw new Error(
    "Käännöspalvelu ei juuri nyt vastaa. Tarkista verkkoyhteys tai palvelimen GEMINI_API_KEY-asetus.",
  );
}
