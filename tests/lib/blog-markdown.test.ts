import { describe, expect, it } from "vitest";
import {
  formatPostDate,
  parsePost,
  readingMinutes,
  renderMarkdown,
  slugifyHeading,
} from "../../src/lib/blog-markdown";

describe("renderMarkdown", () => {
  it("renders headings with anchor ids, demoting # to h2", () => {
    expect(renderMarkdown("# Título\n## Por que faltam?\n### Ação nº 1")).toBe(
      [
        '<h2 id="titulo">Título</h2>',
        '<h2 id="por-que-faltam">Por que faltam?</h2>',
        '<h3 id="acao-n-1">Ação nº 1</h3>',
      ].join("\n"),
    );
  });

  it("joins wrapped lines into one paragraph and splits on blank lines", () => {
    expect(renderMarkdown("Linha um\nlinha dois\n\nOutro parágrafo")).toBe(
      "<p>Linha um linha dois</p>\n<p>Outro parágrafo</p>",
    );
  });

  it("renders unordered and ordered lists, with indented continuation", () => {
    expect(renderMarkdown("- a\n- b\n  continua\n\n1. um\n2. dois")).toBe(
      "<ul><li>a</li><li>b continua</li></ul>\n<ol><li>um</li><li>dois</li></ol>",
    );
  });

  it("renders bold, italic, code, quotes and rules", () => {
    expect(renderMarkdown("**forte** e *leve* com `x*y*`\n\n> citação\n\n---")).toBe(
      "<p><strong>forte</strong> e <em>leve</em> com <code>x*y*</code></p>\n<blockquote><p>citação</p></blockquote>\n<hr />",
    );
  });

  it("opens external links in a new tab and keeps internal ones in place", () => {
    expect(
      renderMarkdown(
        "[site](https://exemplo.com) [preços](/#precos) [home](https://fisiogo.online/)",
      ),
    ).toBe(
      '<p><a href="https://exemplo.com" target="_blank" rel="noopener noreferrer">site</a> ' +
        '<a href="/#precos">preços</a> <a href="https://fisiogo.online/">home</a></p>',
    );
  });

  it("escapes HTML and drops unsafe links", () => {
    expect(renderMarkdown('<script>alert(1)</script> [x](javascript:alert) "a"')).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt; x &quot;a&quot;</p>",
    );
  });
});

describe("parsePost", () => {
  const raw =
    '---\ntitle: "Um post"\ndescription: Resumo curto\ndate: 2026-11-19\n---\n\nCorpo aqui.';

  it("reads the header and defaults the author", () => {
    expect(parsePost(raw)).toEqual({
      meta: {
        title: "Um post",
        description: "Resumo curto",
        date: "2026-11-19",
        updated: undefined,
        author: "Equipe FisioGO",
      },
      body: "\nCorpo aqui.",
    });
  });

  it("rejects posts missing required fields or with a bad date", () => {
    expect(() => parsePost("Sem cabeçalho")).toThrow();
    expect(() => parsePost("---\ntitle: X\ndate: 2026-11-19\n---\n")).toThrow(/description/);
    expect(() => parsePost("---\ntitle: X\ndescription: Y\ndate: 19/11/2026\n---\n")).toThrow(
      /Data/,
    );
  });

  it("reads an optional cover image and validates its fields", () => {
    const comImagem = (extra: string) =>
      `---\ntitle: X\ndescription: Y\ndate: 2026-11-19\nimage: /blog/capa.jpg\n${extra}---\n`;
    expect(
      parsePost(
        comImagem(
          "image_alt: Uma cena\nimage_width: 1280\nimage_height: 1920\nimage_social: /blog/capa-og.jpg\n",
        ),
      ).meta.image,
    ).toEqual({
      src: "/blog/capa.jpg",
      alt: "Uma cena",
      width: 1280,
      height: 1920,
      social: "/blog/capa-og.jpg",
    });
    expect(() => parsePost(comImagem("image_width: 1\nimage_height: 1\n"))).toThrow(/image_alt/);
    expect(() => parsePost(comImagem("image_alt: A\n"))).toThrow(/image_width/);
    expect(() =>
      parsePost(
        comImagem("image_alt: A\nimage_width: 1\nimage_height: 1\nimage_social: capa.jpg\n"),
      ),
    ).toThrow(/caminho/);
  });

  it("accepts Windows line endings", () => {
    expect(parsePost(raw.replace(/\n/g, "\r\n")).meta.title).toBe("Um post");
  });
});

describe("helpers", () => {
  it("slugifies headings without accents", () => {
    expect(slugifyHeading("  Confirmação na véspera!  ")).toBe("confirmacao-na-vespera");
  });

  it("estimates reading time at 200 words per minute, minimum 1", () => {
    expect(readingMinutes("palavra ".repeat(50))).toBe(1);
    expect(readingMinutes("palavra ".repeat(1000))).toBe(5);
  });

  it("formats the date in Portuguese regardless of timezone", () => {
    expect(formatPostDate("2026-11-01")).toBe("1 de novembro de 2026");
  });
});
