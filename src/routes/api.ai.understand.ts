import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/understand")({
  server: { handlers: {
    POST: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "understand");
    },
    OPTIONS: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "understand");
    },
  } },
});
