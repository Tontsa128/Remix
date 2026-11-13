import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const translateSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  from: z.enum(["fi", "es", "en"]),
  to: z.enum(["fi", "es", "en"]),
});

const LANGUAGE_NAMES = {
  fi: "suomi",
  es: "espanja",
  en: "englanti",
} as const;

export const Route = createFileRoute("/api/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = translateSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: "invalid_request", message: "Tarkista käännettävä teksti ja kielet." },
              { status: 400 },
            );
          }

          const { text, from, to } = parsed.data;
          if (from === to) {
            return Response.json({ translatedText: text, from, to });
          }

          const apiKey = process.env["GEMINI_API_KEY"] || process.env["API_KEY"];
          if (apiKey) {
            try {
              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { headers: { "User-Agent": "aistudio-build" } },
              });

              const response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: `Käännä kielestä ${LANGUAGE_NAMES[from]} kieleen ${LANGUAGE_NAMES[to]}:\n${text}`,
                config: {
                  systemInstruction: "Käännä vain annettu teksti. Älä selitä. Palauta pelkkä käännös.",
                },
              });

              const translatedText = (response.text ?? "").trim();
              if (translatedText) {
                return Response.json({ translatedText, from, to, provider: "gemini" });
              }
            } catch (err) {
              console.warn("Gemini translate fallback notice:", err instanceof Error ? err.message : err);
            }
          }

          const { freeTranslateText } = await import("@/lib/free-translate.server");
          const freeResult = await freeTranslateText(text, from, to);
          if (freeResult) {
            return Response.json({ translatedText: freeResult, from, to, provider: "free" });
          }

          return Response.json(
            {
              error: "translation_failed",
              message: "Käännöspalvelu ei juuri nyt vastannut. Tarkista verkkoyhteys.",
            },
            { status: 502 },
          );
        } catch (err) {
          console.error("Translate API error:", err);
          return Response.json(
            {
              error: "translation_failed",
              message: "Käännöspalvelu ei vastannut.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
