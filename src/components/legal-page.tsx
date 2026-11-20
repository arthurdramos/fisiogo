import { BlogShell } from "@/components/blog-shell";
import type { LegalDoc } from "@/lib/legal";

export function legalHead(doc: LegalDoc, path: string) {
  const url = `https://fisiogo.online${path}`;
  const title = `${doc.title} — FisioGO`;
  return {
    meta: [
      { title },
      { name: "description", content: doc.description },
      { property: "og:title", content: title },
      { property: "og:description", content: doc.description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: doc.description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <BlogShell>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {doc.title}
        </h1>
        <p className="mt-4 border-b border-border pb-6 text-sm text-muted-foreground">
          Última atualização: {doc.updatedLabel}
        </p>
        {/* HTML gerado de src/content/legal pelo conversor de src/lib/blog-markdown.ts, que escapa todo o texto. */}
        <div className="blog-prose mt-10" dangerouslySetInnerHTML={{ __html: doc.html }} />
      </article>
    </BlogShell>
  );
}
