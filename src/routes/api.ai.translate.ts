import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/translate")({
  server: { handlers: {
    POST: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "translate");
    },
    OPTIONS: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "translate");
    },
  } },
});
