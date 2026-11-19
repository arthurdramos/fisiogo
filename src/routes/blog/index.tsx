import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogShell } from "@/components/blog-shell";
import { getPosts } from "@/lib/blog";

const TITLE = "Blog FisioGO — gestão de consultório para fisioterapeutas";
const DESCRIPTION =
  "Dicas práticas para fisioterapeutas autônomos organizarem agenda, pacientes, cobrança e rotina do consultório.";
const URL = "https://fisiogo.online/blog";

export const Route = createFileRoute("/blog/")({
  loader: () => getPosts().map(({ html: _html, ...meta }) => meta),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const posts = Route.useLoaderData();

  return (
    <BlogShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Blog</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Gestão de consultório, sem complicação
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{DESCRIPTION}</p>

        <ul className="mt-12 divide-y divide-border border-t border-border">
          {posts.length === 0 && (
            <li className="py-8 text-muted-foreground">Em breve, o primeiro post.</li>
          )}
          {posts.map((p) => (
            <li key={p.slug}>
              <Link to="/blog/$slug" params={{ slug: p.slug }} className="group block py-8">
                <p className="text-xs text-muted-foreground">
                  <time dateTime={p.date}>{p.dateLabel}</time> · {p.readingMinutes} min de leitura
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground transition-colors group-hover:text-primary">
                  {p.title}
                </h2>
                <p className="mt-2 text-muted-foreground">{p.description}</p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">
                  Ler post →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BlogShell>
  );
}
