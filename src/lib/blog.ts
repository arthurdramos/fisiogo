// Posts do blog: cada arquivo src/content/blog/<slug>.md vira
// fisiogo.online/blog/<slug>. Pra publicar um post novo basta criar o
// arquivo (ver o formato do cabeçalho em src/lib/blog-markdown.ts) — a
// lista, o sitemap e a página do post se atualizam sozinhos.
// Post com data no futuro fica escondido até o dia chegar.

import {
  formatPostDate,
  parsePost,
  readingMinutes,
  renderMarkdown,
  type PostMeta,
} from "./blog-markdown";

export type Post = PostMeta & {
  slug: string;
  html: string;
  readingMinutes: number;
  dateLabel: string;
};

const arquivos = import.meta.glob("../content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const todos: Post[] = Object.entries(arquivos)
  .map(([caminho, raw]) => {
    const slug = caminho.split("/").pop()!.replace(/\.md$/, "");
    const { meta, body } = parsePost(raw);
    return {
      ...meta,
      slug,
      html: renderMarkdown(body),
      readingMinutes: readingMinutes(body),
      dateLabel: formatPostDate(meta.date),
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

const hojeBrasilia = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function getPosts(): Post[] {
  const hoje = hojeBrasilia();
  return todos.filter((p) => p.date <= hoje);
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}
