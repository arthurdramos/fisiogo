import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatCurrency, formatDate } from "./format";

export type BillingSessionInfo = {
  scheduled_at: string;
  valor_cobrado: number | null;
};

export function generateBillingReportPdf(patientName: string, sessions: BillingSessionInfo[], total: number): Blob {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Relatório de cobrança", 14, 20);
  doc.setFontSize(11);
  doc.text(`Paciente: ${patientName}`, 14, 30);
  doc.text(`Gerado em: ${formatDate(new Date().toISOString())}`, 14, 36);

  autoTable(doc, {
    startY: 44,
    head: [["Data da sessão", "Valor"]],
    body: sessions.map((s) => [formatDate(s.scheduled_at), formatCurrency(Number(s.valor_cobrado ?? 0))]),
    foot: [["Total", formatCurrency(total)]],
  });

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
