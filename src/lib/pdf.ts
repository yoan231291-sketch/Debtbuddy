import { jsPDF } from "jspdf";

interface ReceiptPdfData {
  brand: string;
  txId: string;
  date: string;
  time: string;
  client: string;
  admin: string;
  concept: string;
  typeLabel: string;
  method: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  status: string;
}

const INDIGO: [number, number, number] = [79, 70, 229];
const SLATE: [number, number, number] = [100, 116, 139];
const DARK: [number, number, number] = [15, 23, 42];

export function buildReceiptPdf(d: ReceiptPdfData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;

  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, W, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(d.brand, M, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Recibo digital · " + d.typeLabel, M, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(d.amount, W - M, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(d.status, W - M, 80, { align: "right" });

  const rows: [string, string][] = [
    ["ID Transacción", d.txId],
    ["Fecha", d.date],
    ["Hora", d.time],
    ["Cliente", d.client],
    ["Administrador", d.admin],
    ["Concepto", d.concept],
    ["Tipo", d.typeLabel],
    ["Método de pago", d.method],
    ["Balance anterior", d.balanceBefore],
    ["Balance nuevo", d.balanceAfter],
    ["Estado", d.status],
  ];

  let y = 160;
  doc.setFontSize(11);
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(M, y - 14, W - M * 2, 26, "F");
    }
    doc.setTextColor(...SLATE);
    doc.setFont("helvetica", "normal");
    doc.text(label, M + 10, y + 3);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), W - M - 10, y + 3, { align: "right" });
    y += 28;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(M, y + 6, W - M, y + 6);
  doc.setTextColor(...SLATE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Documento generado automáticamente por 2PayBack — Plataforma de financiamiento privado.",
    M,
    y + 28
  );
  doc.text("Este recibo es válido como comprobante de la transacción registrada.", M, y + 42);

  return doc;
}

export function downloadReceiptPdf(d: ReceiptPdfData) {
  const doc = buildReceiptPdf(d);
  doc.save(`2PayBack-recibo-${d.txId}.pdf`);
}

export async function shareReceiptPdf(d: ReceiptPdfData): Promise<boolean> {
  const doc = buildReceiptPdf(d);
  const blob = doc.output("blob");
  const file = new File([blob], `2PayBack-recibo-${d.txId}.pdf`, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title: "Recibo 2PayBack", text: d.concept });
    return true;
  }
  doc.save(`2PayBack-recibo-${d.txId}.pdf`);
  return false;
}
