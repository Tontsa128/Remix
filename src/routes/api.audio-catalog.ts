import { createFileRoute } from "@tanstack/react-router";
import { LESSONS, SENTENCE_LESSONS, VOCAB_PACKS } from "@/data/lessons";
import type { LanguageCode } from "@/types/elovio";

function buildTtsUrl(lang: LanguageCode, text: string): string {
  return `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
}

export const Route = createFileRoute("/api/audio-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const category = url.searchParams.get("category")?.trim();
        const kind = url.searchParams.get("kind")?.trim();
        const nativeParam = url.searchParams.get("native");
        const targetParam = url.searchParams.get("target");
        const query = url.searchParams.get("q")?.trim().toLowerCase();

        const nativeLang: LanguageCode =
          nativeParam === "es" || nativeParam === "en" ? nativeParam : "fi";
        const targetLang: LanguageCode =
          targetParam === "fi" || targetParam === "en" ? targetParam : "es";

        let packs = LESSONS;
        if (kind === "word") {
          packs = VOCAB_PACKS;
        } else if (kind === "sentence") {
          packs = SENTENCE_LESSONS;
        }

        if (category && category !== "Kaikki") {
          packs = packs.filter((p) => p.category === category);
        }

        const serializedPacks = packs
          .map((pack) => {
            const filteredItems = query
              ? pack.sentences.filter(
                  (s) =>
                    s.fi.toLowerCase().includes(query) ||
                    s.es.toLowerCase().includes(query) ||
                    s.en.toLowerCase().includes(query),
                )
              : pack.sentences;

            return {
              id: pack.id,
              title: pack.title,
              subtitle: pack.subtitle,
              category: pack.category,
              kind: pack.kind ?? "sentence",
              difficulty: pack.difficulty,
              estimatedMinutes: pack.estimatedMinutes,
              trackCount: filteredItems.length,
              packDownloadUrl: `/api/audio-pack?packId=${encodeURIComponent(pack.id)}&native=${nativeLang}&target=${targetLang}`,
              tracks: filteredItems.map((s) => ({
                id: s.id,
                kind: s.kind ?? pack.kind ?? "sentence",
                fi: s.fi,
                es: s.es,
                en: s.en,
                pronunciationHint: s.pronunciationHint,
                audioUrls: {
                  fi: buildTtsUrl("fi", s.fi),
                  es: buildTtsUrl("es", s.es),
                  en: buildTtsUrl("en", s.en),
                },
              })),
            };
          })
          .filter((p) => p.trackCount > 0);

        const totalTracks = serializedPacks.reduce(
          (sum, p) => sum + p.trackCount,
          0,
        );

        return Response.json(
          {
            languages: ["es", "fi", "en"],
            formats: ["audio/mpeg"],
            totalPacks: serializedPacks.length,
            totalTracks,
            packs: serializedPacks,
          },
          {
            headers: {
              "Cache-Control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
