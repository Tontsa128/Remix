import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const languageSchema = z.enum(["fi", "es", "en"]);
const levelSchema = z.enum(["Aloittaja", "Perustaso", "Keskitaso", "Sujuva"]);

const tutorRequestSchema = z.object({
  mode: z.enum(["chat", "explain"]).default("chat"),
  nativeLanguage: languageSchema.default("fi"),
  targetLanguage: languageSchema.default("es"),
  level: levelSchema.default("Aloittaja"),
  roleplay: z.enum(["free", "waiter", "pharmacist"]).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1500),
      }),
    )
    .max(20)
    .optional(),
  text: z.string().trim().max(2500).optional(),
  imageBase64: z.string().max(4_000_000).optional(),
  imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

const LANG_LABEL = {
  fi: "suomi",
  es: "espanja",
  en: "englanti",
} as const;

export const Route = createFileRoute("/api/tutor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = tutorRequestSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: "invalid_request", message: "Tarkista lähetetyt tiedot." },
              { status: 400 },
            );
          }

          const {
            mode,
            nativeLanguage,
            targetLanguage,
            level,
            roleplay,
            messages,
            text,
            imageBase64,
            imageMimeType,
          } = parsed.data;

          const apiKey = process.env["GEMINI_API_KEY"] || process.env["API_KEY"];

          if (mode === "explain") {
            const cleanPrompt = text?.trim() || "Selitä tämän kuvan teksti ja käännä se selkeästi.";
            if (!text?.trim() && !imageBase64) {
              return Response.json(
                { error: "empty_explain_input", message: "Kirjoita teksti tai lisää kuva selitettäväksi." },
                { status: 400 },
              );
            }

            if (apiKey) {
              try {
                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
                });

                const parts: Array<
                  | { text: string }
                  | { inlineData: { mimeType: string; data: string } }
                > = [];

                if (imageBase64 && imageMimeType) {
                  const pureBase64 = imageBase64.includes(",")
                    ? imageBase64.split(",")[1] ?? ""
                    : imageBase64;
                  parts.push({
                    inlineData: {
                      mimeType: imageMimeType,
                      data: pureBase64,
                    },
                  });
                }

                parts.push({
                  text: `Teksti tai pyyntö: ${cleanPrompt}`,
                });

                const explainInstruction = [
                  `Olet Elovion selkeä kieliapuri.`,
                  `Käyttäjän äidinkieli on ${LANG_LABEL[nativeLanguage]}, opiskeltava kieli on ${LANG_LABEL[targetLanguage]}, taso: ${level}.`,
                  `Vastaa kielellä ${LANG_LABEL[nativeLanguage]} selkeästi kolmessa lyhyessä osassa:`,
                  `1) Käännös`,
                  `2) Keskeiset sanat (2–4 sanaa ja merkitykset)`,
                  `3) Lyhyt kielioppi- tai käyttövinkki`,
                  `Pidä vastaus ytimekkäänä (enintään 110 sanaa).`,
                ].join("\n");

                const response = await ai.models.generateContent({
                  model: "gemini-3.8-flash",
                  contents: [{ role: "user", parts }],
                  config: {
                    systemInstruction: explainInstruction,
                  },
                });

                const reply = (response.text ?? "").trim();
                if (reply) {
                  return Response.json({ reply, provider: "gemini" });
                }
              } catch (err) {
                console.warn("Gemini explain fallback notice:", err instanceof Error ? err.message : err);
              }
            }

            if (imageBase64 && !text?.trim()) {
              return Response.json(
                {
                  error: "vision_requires_gemini_key",
                  message:
                    "Kuvantunnistus vaatii kelvollisen GEMINI_API_KEY-avaimen (Settings > Secrets). Tekstin selitys toimii myös ilman avainta.",
                },
                { status: 503 },
              );
            }

            const { buildFallbackExplainReply } = await import("@/lib/free-translate.server");
            const fallbackReply = await buildFallbackExplainReply({
              text: text?.trim() ?? cleanPrompt,
              nativeLanguage,
              targetLanguage,
            });
            return Response.json({ reply: fallbackReply, provider: "free" });
          }

          // Chat / Roleplay mode
          const chatHistory = (messages ?? []).map((m) => ({
            role: m.role === "assistant" ? ("model" as const) : ("user" as const),
            parts: [{ text: m.content }],
          }));

          if (chatHistory.length === 0) {
            return Response.json(
              { error: "missing_messages", message: "Kirjoita viesti opettajalle." },
              { status: 400 },
            );
          }

          if (apiKey) {
            try {
              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { headers: { "User-Agent": "aistudio-build" } },
              });

              const roleplayGuidance =
                roleplay === "waiter"
                  ? `Roolipeli: olet ystävällinen tarjoilija kahvilassa tai ravintolassa ja vastaat luonnollisesti tilaukseen kielellä ${LANG_LABEL[targetLanguage]}.`
                  : roleplay === "pharmacist"
                    ? `Roolipeli: olet avulias apteekkari apteekissa ja autat asiakasta kielellä ${LANG_LABEL[targetLanguage]}.`
                    : `Olet kannustava kieltenopettaja.`;

              const systemInstruction = [
                `Olet kärsivällinen ja kannustava kieltenopettaja.`,
                `Käyttäjän äidinkieli on ${LANG_LABEL[nativeLanguage]}, kohdekieli on ${LANG_LABEL[targetLanguage]} ja taso on ${level}.`,
                roleplayGuidance,
                `Käytä lyhyitä lauseita kohdekielellä (${LANG_LABEL[targetLanguage]}) ja anna korkeintaan 1 lauseen ystävällinen korjaus sekä 1 käytännön vinkki äidinkielellä (${LANG_LABEL[nativeLanguage]}).`,
                `Pidä koko vastaus enintään 80 sanan pituisena.`,
              ].join("\n");

              const response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: chatHistory,
                config: {
                  systemInstruction,
                },
              });

              const reply = (response.text ?? "").trim();
              if (reply) {
                return Response.json({ reply, provider: "gemini" });
              }
            } catch (err) {
              console.warn("Gemini tutor fallback notice:", err instanceof Error ? err.message : err);
            }
          }

          const lastUserMsg =
            [...(messages ?? [])].reverse().find((m) => m.role === "user")?.content ?? "";
          const { buildFallbackTutorReply } = await import("@/lib/free-translate.server");
          const fallbackReply = await buildFallbackTutorReply({
            lastUserMessage: lastUserMsg,
            nativeLanguage,
            targetLanguage,
            roleplay,
          });
          return Response.json({ reply: fallbackReply, provider: "free" });
        } catch (err) {
          console.error("Tutor API error:", err);
          return Response.json(
            {
              error: "tutor_error",
              message: "Opettaja-palveluun ei saatu yhteyttä.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
