import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
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

const PAGE_HEIGHT = 297;
const MARGIN_X = 14;
const MARGIN_BOTTOM = 20;
const MAX_WIDTH = 210 - MARGIN_X * 2;

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

export function generateBillingReportPdf(data: BillingReportData): Blob {
  const doc = new jsPDF();
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };

  const heading = (text: string, size: 11 | 13 = 11) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.text(text, MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += size === 13 ? 8 : 6;
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text, MAX_WIDTH) as string[];
    ensureSpace(lines.length * 5 + 2);
    doc.text(lines, MARGIN_X, y);
    y += lines.length * 5 + 4;
  };

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const nameLine = data.patientAge != null ? `${data.patientName} - ${data.patientAge}a` : data.patientName;
  doc.text(nameLine, MARGIN_X, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Relatório de Atendimentos", MARGIN_X, y);
  y += 10;
  doc.setFontSize(10);

  if (data.apHistorico) {
    heading("AP");
    paragraph(data.apHistorico);
  }

  if (data.queixaPrincipal) {
    heading("Queixa principal");
    paragraph(data.queixaPrincipal);
  }

  if (data.objetivos) {
    heading("Objetivos terapêuticos");
    paragraph(data.objetivos);
  }

  if (data.exercicios.length > 0) {
    heading("Terapia");
    const text = data.exercicios
      .map((ex) => {
        const partes = [ex.nome];
        if (ex.series_reps) partes.push(`(${ex.series_reps})`);
        if (ex.observacao) partes.push(`- ${ex.observacao}`);
        return `- ${partes.join(" ")}`;
      })
      .join("\n");
    paragraph(text);
  }

  if (data.resumoSections.length > 0) {
    heading("Resumo das atividades do mês", 13);
    for (const section of data.resumoSections) {
      heading(section.label);
      paragraph(section.content);
    }
  }

  ensureSpace(20);
  heading("Atendimentos", 13);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [["Data", "Valor"]],
    body: data.sessions.map((s) => [formatDate(s.scheduled_at), formatCurrency(Number(s.valor_cobrado ?? 0))]),
    foot: [[`Total: ${data.sessions.length} atendimento(s)`, formatCurrency(data.total)]],
  });
  y = (doc as DocWithAutoTable).lastAutoTable?.finalY ?? y + 20;
  y += 10;

  if (data.profissional) {
    const p = data.profissional;
    const bancoLines = [
      p.banco ? `Banco: ${p.banco}` : null,
      p.agencia ? `Agência: ${p.agencia}` : null,
      p.conta ? `Conta: ${p.conta}` : null,
      p.chave_pix ? `Chave PIX: ${p.chave_pix}` : null,
    ].filter((l): l is string => l != null);

    if (bancoLines.length > 0 || p.nome) {
      ensureSpace(30);
      heading("Dados bancários");
      if (bancoLines.length > 0) paragraph(bancoLines.join("\n"));
      if (p.nome) {
        doc.setFont("helvetica", "bold");
        paragraph(p.crefito ? `${p.nome} - CREFITO ${p.crefito}` : p.nome);
        doc.setFont("helvetica", "normal");
      }
      if (p.telefone) paragraph(`Tel: ${p.telefone}`);
    }
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
