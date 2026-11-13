import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Elovio = lazy(() => import("../ElovioApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elovio – Kielikurssi" },
      { name: "description", content: "Opi suomea, espanjaa ja englantia Elovion sanasto- ja kuvaharjoituksilla." },
      { property: "og:title", content: "Elovio – Kielikurssi" },
      { property: "og:description", content: "Kielten oppiminen, sanastoharjoitukset ja kuvallinen oppiminen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="elovio-loading">elovio</div>}>
      <Suspense fallback={<div className="elovio-loading">elovio</div>}>
        <div className="elovio-app"><Elovio /></div>
      </Suspense>
    </ClientOnly>
  );
}
