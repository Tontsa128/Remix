import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai/transcribe")({
  server: { handlers: {
    POST: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "transcribe");
    },
    OPTIONS: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "transcribe");
    },
  } },
});
