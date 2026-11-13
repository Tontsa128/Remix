import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/tutor")({
  server: { handlers: {
    POST: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "tutor");
    },
    OPTIONS: async ({ request }) => {
      const { handleElovioHttp } = await import("@/lib/elovio-api.server");
      return handleElovioHttp(request, "tutor");
    },
  } },
});
