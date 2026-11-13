import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { synthesizePhraseAudio } from "@/lib/audio-tts.server";

const querySchema = z.object({
  lang: z.enum(["fi", "es", "en"]),
  text: z.string().trim().min(1).max(350),
  download: z.string().optional(),
});

async function handleTtsRequest(
  langRaw: string | null,
  textRaw: string | null,
  downloadRaw: string | null,
): Promise<Response> {
  const parsed = querySchema.safeParse({
    lang: langRaw ?? "",
    text: textRaw ?? "",
    download: downloadRaw ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_request",
        message: "Anna kelvollinen kieli (fi, es, en) ja teksti (1-350 merkkiä).",
      },
      { status: 400 },
    );
  }

  try {
    const result = await synthesizePhraseAudio({
      text: parsed.data.text,
      lang: parsed.data.lang,
    });

    if (!result) {
      return Response.json(
        {
          error: "tts_unavailable",
          message: "Äänitiedostoa ei voitu hakea juuri nyt.",
        },
        { status: 502 },
      );
    }

    const headers = new Headers({
      "Content-Type": result.contentType,
      "Content-Length": String(result.bytes.byteLength),
      "Cache-Control": "public, max-age=86400",
      "X-Elovio-Audio-Cache": result.cached ? "hit" : "miss",
    });

    if (parsed.data.download === "1" || parsed.data.download === "true") {
      const safeName = parsed.data.text
        .toLowerCase()
        .replace(/[^a-z0-9äöå]+/gi, "-")
        .slice(0, 32)
        .replace(/^-|-$/g, "");
      headers.set(
        "Content-Disposition",
        `attachment; filename="elovio-${parsed.data.lang}-${safeName || "audio"}.mp3"`,
      );
    }

    return new Response(new Uint8Array(result.bytes), { status: 200, headers });
  } catch (err) {
    console.error("TTS route error:", err);
    return Response.json(
      { error: "tts_error", message: "Äänitiedoston muodostus epäonnistui." },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return handleTtsRequest(
          url.searchParams.get("lang"),
          url.searchParams.get("text"),
          url.searchParams.get("download"),
        );
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            lang?: unknown;
            text?: unknown;
            download?: unknown;
          };
          return handleTtsRequest(
            typeof body?.lang === "string" ? body.lang : null,
            typeof body?.text === "string" ? body.text : null,
            typeof body?.download === "string" ? body.download : null,
          );
        } catch {
          return Response.json(
            { error: "invalid_json", message: "Virheellinen pyyntö." },
            { status: 400 },
          );
        }
      },
    },
  },
});
