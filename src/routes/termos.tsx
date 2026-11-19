import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";
import { getLegalDoc } from "@/lib/legal";

export const Route = createFileRoute("/termos")({
  loader: () => getLegalDoc("termos"),
  head: ({ loaderData }) => (loaderData ? legalHead(loaderData, "/termos") : {}),
  component: Termos,
});

function Termos() {
  return <LegalPage doc={Route.useLoaderData()} />;
}
