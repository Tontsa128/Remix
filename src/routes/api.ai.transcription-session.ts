import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/transcription-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleElovioHttp } = await import("@/lib/elovio-api.server");
        return handleElovioHttp(request, "transcription-session");
      },
      OPTIONS: async ({ request }) => {
        const { handleElovioHttp } = await import("@/lib/elovio-api.server");
        return handleElovioHttp(request, "transcription-session");
      },
    },
  },
});
