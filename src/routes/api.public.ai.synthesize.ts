import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai/synthesize")({
  server: { handlers: {
    POST: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "synthesize");
    },
    OPTIONS: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "synthesize");
    },
  } },
});
