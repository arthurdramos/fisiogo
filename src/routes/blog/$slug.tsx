import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BlogCta, BlogShell } from "@/components/blog-shell";
import { getPost } from "@/lib/blog";

const BASE_URL = "https://fisiogo.online";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) => {
    if (!post) return {};
    const url = `${BASE_URL}/blog/${post.slug}`;
    const title = `${post.title} — Blog FisioGO`;
    // Dados estruturados: o Google usa pra mostrar data e autor no resultado.
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      author: { "@type": "Organization", name: post.author },
      publisher: {
        "@type": "Organization",
        name: "FisioGO",
        logo: { "@type": "ImageObject", url: `${BASE_URL}/logo-fisiogo.png` },
      },
      mainEntityOfPage: url,
      inLanguage: "pt-BR",
    };
    return {
      meta: [
        { title },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: post.date },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: BlogPost,
  notFoundComponent: PostNotFound,
});

function BlogPost() {
  const post = Route.useLoaderData();

  return (
    <BlogShell>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <Link to="/blog" className="text-sm font-medium text-primary hover:underline">
          ← Todos os posts
        </Link>
        <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
        <p className="mt-6 border-b border-border pb-6 text-sm text-muted-foreground">
          {post.author} · <time dateTime={post.date}>{post.dateLabel}</time> · {post.readingMinutes}{" "}
          min de leitura
        </p>

        {/* HTML gerado de src/content/blog pelo conversor de src/lib/blog-markdown.ts, que escapa todo o texto. */}
        <div className="blog-prose mt-10" dangerouslySetInnerHTML={{ __html: post.html }} />

        <BlogCta />
      </article>
    </BlogShell>
  );
}

function PostNotFound() {
  return (
    <BlogShell>
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-semibold text-foreground">Post não encontrado</h1>
        <p className="mt-3 text-muted-foreground">Esse endereço não existe ou o post saiu do ar.</p>
        <Link to="/blog" className="mt-6 inline-block font-medium text-primary hover:underline">
          Ver todos os posts
        </Link>
      </div>
    </BlogShell>
  );
}
