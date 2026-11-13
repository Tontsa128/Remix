import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI, Modality } from "@google/genai";

const ALLOWED_TARGETS = new Set(["fi", "es", "en"]);
const LIVE_TRANSLATE_MODEL = "gemini-3.5-live-translate-preview";

export const Route = createFileRoute("/api/live-token")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const target = (url.searchParams.get("target") ?? "es").trim().toLowerCase();
          if (!ALLOWED_TARGETS.has(target)) {
            return Response.json(
              { error: "invalid_target", message: "Tuettuja kieliä ovat fi, es ja en." },
              { status: 400 },
            );
          }

          const apiKey = process.env["GEMINI_API_KEY"] || process.env["API_KEY"];
          if (!apiKey) {
            return Response.json(
              { error: "missing_api_key", message: "Palvelimen käännösavain puuttuu." },
              { status: 503 },
            );
          }

          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              apiVersion: "v1alpha",
              headers: { "User-Agent": "aistudio-build" },
            },
          });

          const now = Date.now();
          const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
          const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString();

          const token = await ai.authTokens.create({
            config: {
              uses: 1,
              expireTime,
              newSessionExpireTime,
              liveConnectConstraints: {
                model: LIVE_TRANSLATE_MODEL,
                config: {
                  responseModalities: [Modality.AUDIO],
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
                  translationConfig: {
                    targetLanguageCode: target,
                    echoTargetLanguage: false,
                  },
                },
              },
            },
          });

          if (!token?.name) {
            return Response.json(
              { error: "token_creation_failed", message: "Live-istunnon avaimen luonti epäonnistui." },
              { status: 502 },
            );
          }

          return Response.json(
            {
              token: token.name,
              expiresAt: expireTime,
              target,
              model: LIVE_TRANSLATE_MODEL,
            },
            {
              headers: {
                "Cache-Control": "no-store",
              },
            },
          );
        } catch (err) {
          const status =
            typeof err === "object" && err !== null && "status" in err
              ? Number((err as { status?: unknown }).status)
              : undefined;
          const msg = err instanceof Error ? err.message : String(err);
          console.error("Live token API error:", status, msg);
          const isKeyError =
            /API_KEY_INVALID|API key not valid|PERMISSION_DENIED/i.test(msg);
          return Response.json(
            {
              error: isKeyError ? "api_key_invalid" : "live_token_error",
              message: isKeyError
                ? "Tarkista GEMINI_API_KEY AI Studion Settings > Secrets -valikossa."
                : "Live-tulkin yhdistäminen epäonnistui.",
              statusCode: status ?? 500,
            },
            { status: status && status >= 400 && status < 600 ? status : 500 },
          );
        }
      },
    },
  },
});
