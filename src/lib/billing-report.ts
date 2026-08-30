import jsPDF from "jspdf";
import { formatCurrency, formatDate } from "./format";

export type BillingSessionInfo = {
  scheduled_at: string;
  valor_cobrado: number | null;
};

export type BillingProfessionalInfo = {
  nome: string | null;
  crefito: string | null;
  telefone: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  chave_pix: string | null;
};

export type BillingExercicio = {
  nome: string;
  series_reps: string | null;
  observacao: string | null;
};

export type BillingResumoSection = {
  label: string;
  content: string;
};

export type BillingReportData = {
  patientName: string;
  patientAge: number | null;
  apHistorico: string | null;
  queixaPrincipal: string | null;
  objetivos: string | null;
  exercicios: BillingExercicio[];
  resumoSections: BillingResumoSection[];
  sessions: BillingSessionInfo[];
  total: number;
  profissional: BillingProfessionalInfo | null;
};

// Paleta do relatório (ver referência visual do redesign) — mantida à parte
// da paleta do app porque este documento é impresso/exportado, não tela.
const NAVY: [number, number, number] = [18, 40, 61];
const TEAL: [number, number, number] = [15, 139, 138];
const TEAL_DEEP: [number, number, number] = [11, 105, 104];
const TEAL_SOFT: [number, number, number] = [229, 243, 242];
const TOTAL_ACCENT: [number, number, number] = [95, 217, 196];
const SURFACE: [number, number, number] = [245, 247, 247];
const INK: [number, number, number] = [28, 43, 51];
const MUTED: [number, number, number] = [107, 122, 128];
const LINE: [number, number, number] = [227, 233, 233];
const WHITE: [number, number, number] = [255, 255, 255];
const WHITE_MUTED: [number, number, number] = [176, 189, 194];
const WHITE_FAINT: [number, number, number] = [140, 156, 163];

// Fontes: o app usa Fraunces/Plus Jakarta Sans/IBM Plex Mono na tela, mas o
// jsPDF não embute fontes externas por padrão — usamos as fontes nativas de
// categoria equivalente (serif/sans/mono) em vez de embutir arquivos de fonte,
// pra manter a hierarquia visual sem inflar o bundle.
const FONT_SERIF = "times";
const FONT_SANS = "helvetica";
const FONT_MONO = "courier";

const PAGE_HEIGHT = 297;
const PAGE_WIDTH = 210;
const MARGIN_X = 16;
const MARGIN_BOTTOM = 20;
const MAX_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function monthYear(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function monthNameOnly(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "long" });
}

function formatPeriodRange(start: Date, end: Date) {
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${dd(start)}–${dd(end)} de ${monthYear(end)}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${dd(start)} de ${monthNameOnly(start)}–${dd(end)} de ${monthYear(end)}`;
  }
  return `${dd(start)} de ${monthYear(start)}–${dd(end)} de ${monthYear(end)}`;
}

// Versão curta (ex: "01–20 ago"), usada só na faixa de estatísticas — a
// célula é estreita demais pra caber "de agosto de 2026" por extenso.
function formatPeriodRangeShort(start: Date, end: Date) {
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
  const mon = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${dd(start)}–${dd(end)} ${mon(end)}`;
  }
  return `${dd(start)} ${mon(start)}–${dd(end)} ${mon(end)}`;
}

export function generateBillingReportPdf(data: BillingReportData): Blob {
  const doc = new jsPDF();
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  // ---- Cabeçalho: eyebrow -> nome -> idade (Etapa 0) ----
  doc.setFont(FONT_SANS, "bold");
  doc.setFontSize(8.5);
  setColor(TEAL_DEEP);
  doc.text("RELATÓRIOS DE ATENDIMENTOS", MARGIN_X, y);
  y += 9;

  doc.setFont(FONT_SERIF, "bold");
  doc.setFontSize(23);
  setColor(NAVY);
  doc.text(data.patientName, MARGIN_X, y);
  y += 7;

  if (data.patientAge != null) {
    doc.setFont(FONT_SANS, "normal");
    doc.setFontSize(10);
    setColor(MUTED);
    doc.text(`${data.patientAge} anos`, MARGIN_X, y);
    y += 6;
  }
  y += 6;

  // ---- Faixa de estatísticas: Sessões no período / Período / Duração do ciclo (Etapa 0) ----
  const dates = data.sessions.map((s) => new Date(s.scheduled_at)).sort((a, b) => a.getTime() - b.getTime());
  if (dates.length > 0) {
    const first = dates[0];
    const last = dates[dates.length - 1];
    const cicloDias =
      Math.round((Date.UTC(last.getFullYear(), last.getMonth(), last.getDate()) -
        Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) /
        86400000) + 1;

    const stats: [string, string][] = [
      [String(data.sessions.length).padStart(2, "0"), "Sessões no período"],
      [formatPeriodRangeShort(first, last), "Período"],
      [`${cicloDias} dias`, "Duração do ciclo"],
    ];

    const stripH = 20;
    ensureSpace(stripH + 8);
    const cellW = MAX_WIDTH / 3;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.roundedRect(MARGIN_X, y, MAX_WIDTH, stripH, 2, 2, "S");
    doc.line(MARGIN_X + cellW, y, MARGIN_X + cellW, y + stripH);
    doc.line(MARGIN_X + cellW * 2, y, MARGIN_X + cellW * 2, y + stripH);

    stats.forEach(([value, label], i) => {
      const cellX = MARGIN_X + cellW * i + 5;
      doc.setFont(FONT_MONO, "bold");
      doc.setFontSize(12.5);
      setColor(NAVY);
      doc.text(value, cellX, y + 10);
      doc.setFont(FONT_SANS, "normal");
      doc.setFontSize(7.8);
      setColor(MUTED);
      doc.text(label, cellX, y + 16);
    });
    y += stripH + 12;
  }

  // ---- Helpers de texto corrido (usados nos blocos de texto simples) ----
  const blockHeading = (text: string) => {
    ensureSpace(16);
    doc.setFont(FONT_SERIF, "bold");
    doc.setFontSize(13.5);
    setColor(NAVY);
    doc.text(text, MARGIN_X, y);
    y += 7;
  };

  const paragraph = (text: string) => {
    doc.setFont(FONT_SANS, "normal");
    doc.setFontSize(10);
    setColor(INK);
    const lines = doc.splitTextToSize(text, MAX_WIDTH) as string[];
    ensureSpace(lines.length * 5 + 2);
    doc.text(lines, MARGIN_X, y);
    y += lines.length * 5 + 9;
  };

  // ---- AP/Histórico e Quadro clínico (Etapa 1) — cada bloco só aparece se tiver conteúdo ----
  if (data.apHistorico?.trim()) {
    blockHeading("AP / Histórico");
    paragraph(data.apHistorico.trim());
  }

  if (data.queixaPrincipal?.trim()) {
    blockHeading("Quadro clínico");
    paragraph(data.queixaPrincipal.trim());
  }

  // ---- Objetivos terapêuticos: checklist (uma linha do texto = um item) ----
  const objetivosItens = (data.objetivos ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (objetivosItens.length > 0) {
    blockHeading("Objetivos terapêuticos");
    doc.setFont(FONT_SANS, "normal");
    doc.setFontSize(10);
    const indent = 7;
    for (const item of objetivosItens) {
      const lines = doc.splitTextToSize(item, MAX_WIDTH - indent) as string[];
      ensureSpace(lines.length * 5 + 3);
      const cx = MARGIN_X + 1.6;
      const cy = y - 1.4;
      doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
      doc.setFillColor(TEAL_SOFT[0], TEAL_SOFT[1], TEAL_SOFT[2]);
      doc.circle(cx, cy, 1.6, "FD");
      doc.setDrawColor(TEAL_DEEP[0], TEAL_DEEP[1], TEAL_DEEP[2]);
      doc.setLineWidth(0.45);
      doc.line(cx - 0.7, cy + 0.05, cx - 0.15, cy + 0.55);
      doc.line(cx - 0.15, cy + 0.55, cx + 0.75, cy - 0.55);
      doc.setLineWidth(0.2);
      setColor(INK);
      doc.text(lines, MARGIN_X + indent, y);
      y += lines.length * 5 + 3;
    }
    y += 6;
  }

  // ---- Plano terapêutico: lista de tópicos, marcador teal + nome em negrito navy (Etapa 2) ----
  if (data.exercicios.length > 0) {
    blockHeading("Plano terapêutico");
    const indent = 5.5;
    for (const ex of data.exercicios) {
      const partes = [ex.series_reps, ex.observacao].filter((p): p is string => !!p?.trim());
      const desc = partes.join(", ");

      ensureSpace(6);
      doc.setFont(FONT_SANS, "normal");
      doc.setFontSize(10);
      setColor(TEAL);
      doc.text("–", MARGIN_X, y);

      const words: { word: string; bold: boolean }[] = [
        ...ex.nome.split(" ").map((w) => ({ word: w, bold: true })),
        ...(desc ? [{ word: "—", bold: false }, ...desc.split(" ").map((w) => ({ word: w, bold: false }))] : []),
      ];
      const textX = MARGIN_X + indent;
      const maxW = MAX_WIDTH - indent;
      const lineHeight = 5;
      let cx = textX;
      const spaceW = doc.getTextWidth(" ");
      for (const { word, bold } of words) {
        doc.setFont(FONT_SANS, bold ? "bold" : "normal");
        setColor(bold ? NAVY : INK);
        const w = doc.getTextWidth(word);
        if (cx > textX && cx + w > textX + maxW) {
          y += lineHeight;
          ensureSpace(lineHeight);
          cx = textX;
        }
        doc.text(word, cx, y);
        cx += w + spaceW;
      }
      y += lineHeight + 4;
    }
    y += 3;
  }

  // ---- Resumo do período: blocos empilhados, borda esquerda teal (Etapa 3) ----
  if (data.resumoSections.length > 0) {
    blockHeading("Resumo do período");
    for (const section of data.resumoSections) {
      const lines = doc.splitTextToSize(section.content, MAX_WIDTH - 6) as string[];
      ensureSpace(6 + lines.length * 4.6);
      const blockTop = y - 3.5;
      doc.setFont(FONT_SANS, "bold");
      doc.setFontSize(9.5);
      setColor(NAVY);
      doc.text(section.label, MARGIN_X + 6, y);
      y += 5.5;
      doc.setFont(FONT_SANS, "normal");
      doc.setFontSize(9.5);
      setColor(INK);
      doc.text(lines, MARGIN_X + 6, y);
      y += lines.length * 4.6;
      doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
      doc.setLineWidth(0.7);
      doc.line(MARGIN_X, blockTop, MARGIN_X, y);
      doc.setLineWidth(0.2);
      y += 8;
    }
    y += 2;
  }

  // ---- Cobrança: card navy com tabela Data/Valor + total (Etapa 4) ----
  if (data.sessions.length > 0) {
    const rowH = 7;
    const headerH = 20;
    const tableHeadH = 8;
    const totalH = 11;
    const padBottom = 8;
    const cardH = headerH + tableHeadH + data.sessions.length * rowH + totalH + padBottom;

    ensureSpace(cardH + 10);
    const cardTop = y;
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.roundedRect(MARGIN_X, cardTop, MAX_WIDTH, cardH, 3, 3, "F");

    const padX = 9;
    let cy = cardTop + 12;
    doc.setFont(FONT_SERIF, "bold");
    doc.setFontSize(14.5);
    setColor(WHITE);
    doc.text("Resumo da cobrança", MARGIN_X + padX, cy);

    if (dates.length > 0) {
      doc.setFont(FONT_SANS, "normal");
      doc.setFontSize(8.3);
      setColor(WHITE_MUTED);
      const sub = `Referente a ${formatPeriodRange(dates[0], dates[dates.length - 1])}`;
      doc.text(sub, MARGIN_X + MAX_WIDTH - padX, cy, { align: "right" });
    }
    cy = cardTop + headerH;

    doc.setFont(FONT_SANS, "bold");
    doc.setFontSize(8);
    setColor(WHITE_FAINT);
    doc.text("DATA", MARGIN_X + padX, cy);
    doc.text("VALOR", MARGIN_X + MAX_WIDTH - padX, cy, { align: "right" });
    doc.setDrawColor(255, 255, 255);
    cy += 3;

    for (const s of data.sessions) {
      cy += rowH;
      doc.setFont(FONT_MONO, "normal");
      doc.setFontSize(9.5);
      setColor([225, 231, 233]);
      doc.text(formatDate(s.scheduled_at), MARGIN_X + padX, cy);
      doc.text(formatCurrency(Number(s.valor_cobrado ?? 0)), MARGIN_X + MAX_WIDTH - padX, cy, { align: "right" });
    }

    cy += totalH;
    doc.setFont(FONT_SANS, "bold");
    doc.setFontSize(9.5);
    setColor(WHITE_MUTED);
    doc.text("TOTAL", MARGIN_X + padX, cy);
    doc.setFont(FONT_MONO, "bold");
    doc.setFontSize(15.5);
    setColor(TOTAL_ACCENT);
    doc.text(formatCurrency(data.total), MARGIN_X + MAX_WIDTH - padX, cy, { align: "right" });

    y = cardTop + cardH + 10;
  }

  // ---- Dados para pagamento: box claro, grid de valores em mono (Etapa 4) ----
  if (data.profissional) {
    const p = data.profissional;
    const campos = [
      ["Banco", p.banco],
      ["Agência", p.agencia],
      ["Conta", p.conta],
      ["Chave PIX", p.chave_pix],
    ].filter((c): c is [string, string] => !!c[1]);

    if (campos.length > 0) {
      const boxH = 24;
      ensureSpace(boxH + 8);
      doc.setFillColor(SURFACE[0], SURFACE[1], SURFACE[2]);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.roundedRect(MARGIN_X, y, MAX_WIDTH, boxH, 3, 3, "FD");

      doc.setFont(FONT_SANS, "bold");
      doc.setFontSize(9.5);
      setColor(NAVY);
      doc.text("Dados para pagamento", MARGIN_X + 9, y + 10);

      const colW = MAX_WIDTH / campos.length;
      campos.forEach(([label, value], i) => {
        const cellX = MARGIN_X + 9 + colW * i;
        doc.setFont(FONT_SANS, "normal");
        doc.setFontSize(7.5);
        setColor(MUTED);
        doc.text(label, cellX, y + 17);
        doc.setFont(FONT_MONO, "normal");
        doc.setFontSize(9.5);
        setColor(INK);
        doc.text(value, cellX, y + 21.5);
      });
      y += boxH + 10;
    }
  }

  // ---- Rodapé: profissional à esquerda, "gerado via" à direita (Etapa 5) ----
  const nome = data.profissional?.nome;
  if (nome) {
    const p = data.profissional!;
    ensureSpace(16);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.line(MARGIN_X, y, MARGIN_X + MAX_WIDTH, y);
    y += 7;

    doc.setFont(FONT_SANS, "bold");
    doc.setFontSize(9.5);
    setColor(NAVY);
    doc.text(nome, MARGIN_X, y);
    const nameW = doc.getTextWidth(nome + "  ");

    const detalhes = [p.crefito ? `CREFITO ${p.crefito}` : null, p.telefone].filter((d): d is string => !!d).join(" · ");
    if (detalhes) {
      doc.setFont(FONT_SANS, "normal");
      doc.setFontSize(9.5);
      setColor(MUTED);
      doc.text(detalhes, MARGIN_X + nameW, y);
    }

    doc.setFont(FONT_MONO, "normal");
    doc.setFontSize(8);
    setColor(MUTED);
    doc.text(`Gerado via FisioGO · ${formatDate(new Date().toISOString())}`, MARGIN_X + MAX_WIDTH, y, {
      align: "right",
    });
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Relatório de cobrança" });
      return;
    } catch {
      // usuário cancelou o compartilhamento ou o navegador recusou — cai no download
    }
  }
  downloadBlob(blob, filename);
}
