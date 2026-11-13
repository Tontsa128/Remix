import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LESSONS } from "@/data/lessons";
import { synthesizeLessonPackMp3 } from "@/lib/audio-tts.server";

const packQuerySchema = z.object({
  packId: z.string().trim().min(1),
  native: z.enum(["fi", "es", "en"]).default("fi"),
  target: z.enum(["fi", "es", "en"]).default("es"),
  style: z
    .enum(["active_recall", "comprehension", "immersion"])
    .default("active_recall"),
});

export const Route = createFileRoute("/api/audio-pack")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = packQuerySchema.safeParse({
          packId: url.searchParams.get("packId") ?? "",
          native: url.searchParams.get("native") ?? "fi",
          target: url.searchParams.get("target") ?? "es",
          style: url.searchParams.get("style") ?? "active_recall",
        });

        if (!parsed.success) {
          return Response.json(
            { error: "invalid_request", message: "Tarkista paketin tiedot." },
            { status: 400 },
          );
        }

        const lesson = LESSONS.find((l) => l.id === parsed.data.packId);
        if (!lesson) {
          return Response.json(
            { error: "pack_not_found", message: "Äänipakettia ei löytynyt." },
            { status: 404 },
          );
        }

        try {
          const mp3 = await synthesizeLessonPackMp3({
            sentences: lesson.sentences,
            nativeLang: parsed.data.native,
            targetLang: parsed.data.target,
            style: parsed.data.style,
          });

          if (!mp3) {
            return Response.json(
              {
                error: "pack_synthesis_failed",
                message: "Paketin äänitiedostoa ei voitu muodostaa.",
              },
              { status: 502 },
            );
          }

          const filename = `elovio-${parsed.data.target}-${lesson.id}.mp3`;
          return new Response(new Uint8Array(mp3), {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Length": String(mp3.byteLength),
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch (err) {
          console.error("Audio pack synthesis error:", err);
          return Response.json(
            {
              error: "pack_error",
              message: "Äänipaketin lataus epäonnistui.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
