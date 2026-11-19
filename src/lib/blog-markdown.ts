// Conversor de Markdown dos posts do blog (src/content/blog/*.md).
//
// Os posts são escritos por nós e ficam no repositório, então basta um
// subconjunto pequeno e previsível de Markdown — sem dependência nova:
//   ## Título / ### Subtítulo        parágrafos separados por linha em branco
//   - item / 1. item                 > citação        --- (linha divisória)
//   **negrito**  *itálico*  `código`  [texto](https://link)
// Todo texto é escapado antes de virar HTML; links só com http(s), mailto,
// caminho do próprio site (/...) ou âncora (#...).

export type PostMeta = {
  title: string;
  description: string;
  /** AAAA-MM-DD */
  date: string;
  updated?: string;
  author: string;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function slugifyHeading(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const linkSeguro = (url: string) => /^(https?:\/\/|mailto:|\/|#)/i.test(url);

function inline(text: string): string {
  // Código primeiro, guardado à parte, pra nada dentro dele virar formatação.
  // O marcador <cN> não colide com o texto: depois do escape não sobra "<".
  const codigos: string[] = [];
  let s = escapeHtml(text).replace(/`([^`]+)`/g, (_, c: string) => {
    codigos.push(`<code>${c}</code>`);
    return `<c${codigos.length - 1}>`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) => {
    if (!linkSeguro(url)) return label;
    const externo = /^https?:\/\//i.test(url) && !/^https?:\/\/(www\.)?fisiogo\.online/i.test(url);
    return externo
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : `<a href="${url}">${label}</a>`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  return s.replace(/<c(\d+)>/g, (_, i: string) => codigos[Number(i)]);
}

export function renderMarkdown(md: string): string {
  const linhas = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let paragrafo: string[] = [];
  let lista: { tipo: "ul" | "ol"; itens: string[] } | null = null;
  let citacao: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) out.push(`<p>${inline(paragrafo.join(" "))}</p>`);
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista)
      out.push(
        `<${lista.tipo}>${lista.itens.map((i) => `<li>${inline(i)}</li>`).join("")}</${lista.tipo}>`,
      );
    lista = null;
  };
  const fecharCitacao = () => {
    if (citacao.length) out.push(`<blockquote><p>${inline(citacao.join(" "))}</p></blockquote>`);
    citacao = [];
  };
  const fecharTudo = () => {
    fecharParagrafo();
    fecharLista();
    fecharCitacao();
  };

  for (const bruta of linhas) {
    const linha = bruta.trimEnd();
    if (!linha.trim()) {
      fecharTudo();
      continue;
    }

    const titulo = /^(#{1,3})\s+(.+)$/.exec(linha);
    if (titulo) {
      fecharTudo();
      // # vira h2: o h1 da página é o título do post.
      const nivel = Math.max(2, titulo[1].length);
      const texto = titulo[2].trim();
      out.push(`<h${nivel} id="${slugifyHeading(texto)}">${inline(texto)}</h${nivel}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(linha.trim())) {
      fecharTudo();
      out.push("<hr />");
      continue;
    }

    const cit = /^>\s?(.*)$/.exec(linha);
    if (cit) {
      fecharParagrafo();
      fecharLista();
      citacao.push(cit[1]);
      continue;
    }

    const ul = /^[-*]\s+(.+)$/.exec(linha);
    const ol = /^\d+[.)]\s+(.+)$/.exec(linha);
    if (ul || ol) {
      fecharParagrafo();
      fecharCitacao();
      const tipo = ul ? "ul" : "ol";
      if (!lista || lista.tipo !== tipo) {
        fecharLista();
        lista = { tipo, itens: [] };
      }
      lista.itens.push((ul ?? ol)![1]);
      continue;
    }

    // Linha recuada logo depois de um item continua o mesmo item.
    if (lista && /^\s+/.test(bruta)) {
      lista.itens[lista.itens.length - 1] += " " + linha.trim();
      continue;
    }

    fecharLista();
    fecharCitacao();
    paragrafo.push(linha.trim());
  }
  fecharTudo();
  return out.join("\n");
}

// Cabeçalho do post entre linhas "---", com "chave: valor" por linha.
export function parsePost(raw: string): { meta: PostMeta; body: string } {
  // Tira o BOM (U+FEFF) que alguns editores do Windows põem no começo do arquivo.
  const semBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const texto = semBom.replace(/\r\n?/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(texto);
  if (!m) throw new Error("Post sem cabeçalho (--- title/description/date ---)");
  const campos: Record<string, string> = {};
  for (const linha of m[1].split("\n")) {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(linha.trim());
    if (kv) campos[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  for (const obrigatorio of ["title", "description", "date"]) {
    if (!campos[obrigatorio]) throw new Error(`Post sem "${obrigatorio}" no cabeçalho`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campos.date))
    throw new Error(`Data inválida no post: ${campos.date}`);
  return {
    meta: {
      title: campos.title,
      description: campos.description,
      date: campos.date,
      updated: campos.updated || undefined,
      author: campos.author || "Equipe FisioGO",
    },
    body: m[2],
  };
}

export function readingMinutes(body: string) {
  const palavras = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

/** "19 de novembro de 2026", sem depender do fuso de quem lê. */
export function formatPostDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
