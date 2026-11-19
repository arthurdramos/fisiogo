import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getPosts } from "@/lib/blog";

const BASE_URL = "https://fisiogo.online";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = getPosts();
        const entries: Array<{
          path: string;
          changefreq: string;
          priority: string;
          lastmod?: string;
          image?: string;
        }> = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/blog", changefreq: "weekly", priority: "0.7", lastmod: posts[0]?.date },
          ...posts.map((p) => ({
            path: `/blog/${p.slug}`,
            changefreq: "monthly",
            priority: "0.6",
            lastmod: p.updated ?? p.date,
            image: p.image?.src,
          })),
          { path: "/auth", changefreq: "monthly", priority: "0.4" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n` +
            (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
            // Extensão de imagem do sitemap: ajuda a capa a aparecer no Google Imagens.
            (e.image
              ? `    <image:image>\n      <image:loc>${BASE_URL}${e.image}</image:loc>\n    </image:image>\n`
              : "") +
            `    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
