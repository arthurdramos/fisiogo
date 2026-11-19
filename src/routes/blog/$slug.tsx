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
    const img = post.image;
    // Pra compartilhamento (WhatsApp, Facebook, LinkedIn, Google Discover) vale
    // o recorte paisagem 1200x630, se houver; senão a própria capa.
    const social = img
      ? img.social
        ? { url: `${BASE_URL}${img.social}`, width: 1200, height: 630 }
        : { url: `${BASE_URL}${img.src}`, width: img.width, height: img.height }
      : null;
    const imageMeta = img
      ? [
          { property: "og:image", content: social!.url },
          { property: "og:image:width", content: String(social!.width) },
          { property: "og:image:height", content: String(social!.height) },
          { property: "og:image:alt", content: img.alt },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: social!.url },
          { name: "twitter:image:alt", content: img.alt },
        ]
      : [];
    // Dados estruturados: o Google usa pra mostrar data, autor e imagem no
    // resultado (e no Discover, que pede imagem de 1200px+ de largura).
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      ...(img && {
        image: [
          {
            "@type": "ImageObject",
            url: `${BASE_URL}${img.src}`,
            width: img.width,
            height: img.height,
            caption: img.alt,
          },
          ...(img.social
            ? [
                {
                  "@type": "ImageObject",
                  url: social!.url,
                  width: 1200,
                  height: 630,
                  caption: img.alt,
                },
              ]
            : []),
        ],
      }),
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
        // Sem estes, valeriam os da landing, definidos em __root.tsx.
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: post.date },
        ...imageMeta,
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

        {post.image && (
          // Capa em 4:3, recortada no terço de cima, onde costumam ficar os rostos
          // nas fotos em retrato. width/height reservam o espaço (sem "pulo" ao carregar).
          <img
            src={post.image.src}
            alt={post.image.alt}
            width={post.image.width}
            height={post.image.height}
            decoding="async"
            className="mt-8 aspect-[4/3] w-full rounded-2xl object-cover"
            style={{ objectPosition: "50% 38%" }}
          />
        )}

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
