// Páginas legais (/privacidade e /termos): o texto fica em
// src/content/legal/<nome>.md, no mesmo formato dos posts do blog
// (cabeçalho title/description/date + Markdown). Para atualizar, edite o
// arquivo e troque a data no cabeçalho — ela aparece como "Última atualização".

import { formatPostDate, parsePost, renderMarkdown } from "./blog-markdown";

export type LegalDoc = {
  title: string;
  description: string;
  updatedLabel: string;
  html: string;
};

const arquivos = import.meta.glob("../content/legal/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function getLegalDoc(nome: "privacidade" | "termos"): LegalDoc {
  const raw = arquivos[`../content/legal/${nome}.md`];
  const { meta, body } = parsePost(raw);
  return {
    title: meta.title,
    description: meta.description,
    updatedLabel: formatPostDate(meta.date),
    html: renderMarkdown(body),
  };
}
