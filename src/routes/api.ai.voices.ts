import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/voices")({
  server: { handlers: {
    GET: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "voices");
    },
    OPTIONS: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "voices");
    },
  } },
});
