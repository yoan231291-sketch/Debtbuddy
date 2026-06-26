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

interface ContractPdfData {
  title: string;
  templateLabel: string;
  adminName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  total: string;
  downPayment: string;
  financed: string;
  installments: string;
  frequency: string;
  dailyLateFee: string;
  startDate: string;
  endDate: string;
  status: string;
  terms: string;
  adminSignature?: string;
  clientSignature?: string;
}

export function buildContractPdf(d: ContractPdfData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 56;

  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, W, 8, "F");
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("2PayBack", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(d.templateLabel + " · Estado: " + d.status, W - M, y, { align: "right" });
  y += 28;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(d.title, M, y);
  y += 24;
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, W - M, y);
  y += 22;

  const section = (t: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INDIGO);
    doc.text(t, M, y);
    y += 16;
    doc.setTextColor(...DARK);
  };
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text(label, M, y);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.text(value || "—", M + 150, y);
    y += 16;
  };

  section("Partes del acuerdo");
  row("Acreedor / Administrador", d.adminName);
  row("Cliente", d.clientName);
  row("Email", d.clientEmail);
  row("Teléfono", d.clientPhone);
  row("Dirección", d.clientAddress);
  y += 8;

  section("Términos financieros");
  row("Monto total", d.total);
  row("Pago inicial", d.downPayment);
  row("Balance financiado", d.financed);
  row("Cuotas", d.installments + " (" + d.frequency + ")");
  row("Penalización por atraso", d.dailyLateFee + " / día");
  row("Fecha de inicio", d.startDate);
  row("Fecha de vencimiento", d.endDate);
  y += 8;

  if (d.terms) {
    section("Condiciones");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(d.terms, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 13 + 10;
  }

  if (y > 640) {
    doc.addPage();
    y = 56;
  }
  section("Firmas electrónicas");
  y += 10;
  const sigW = 200;
  const sigH = 60;
  const drawSig = (x: number, label: string, who: string, img?: string) => {
    if (img) {
      try {
        doc.addImage(img, "PNG", x, y - sigH, sigW, sigH);
      } catch {
        /* ignore */
      }
    }
    doc.setDrawColor(150, 150, 160);
    doc.line(x, y + 4, x + sigW, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(label, x, y + 18);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.text(who, x, y + 31);
  };
  drawSig(M, "Firma del Administrador", d.adminName, d.adminSignature);
  drawSig(W - M - sigW, "Firma del Cliente", d.clientName, d.clientSignature);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    "Documento generado por 2PayBack. Las firmas electrónicas tienen validez como expresión de consentimiento.",
    M,
    760
  );
  return doc;
}

export function downloadContractPdf(d: ContractPdfData) {
  buildContractPdf(d).save(`2PayBack-contrato-${d.clientName.replace(/\s+/g, "-")}.pdf`);
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
