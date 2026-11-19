import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";
import { getLegalDoc } from "@/lib/legal";

export const Route = createFileRoute("/privacidade")({
  loader: () => getLegalDoc("privacidade"),
  head: ({ loaderData }) => (loaderData ? legalHead(loaderData, "/privacidade") : {}),
  component: Privacidade,
});

function Privacidade() {
  return <LegalPage doc={Route.useLoaderData()} />;
}
