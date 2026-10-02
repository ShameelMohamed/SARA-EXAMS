import { jsPDF } from 'jspdf';

export interface MinimalReportRow {
  email: string;
  fullName?: string;
  mark: number;
}

export function generateMinimalPDF(examTitle: string, qpCode: string, dateStr: string, rows: MinimalReportRow[]) {
  const doc = new jsPDF();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`SARA EXAMS - Examination Report`, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Examination: ${examTitle} (${qpCode})`, 14, 28);
  doc.text(`Date: ${dateStr}`, 14, 34);

  let startY = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Full Name', 14, startY);
  doc.text('Mail ID', 85, startY);
  doc.text('Mark', 165, startY);

  doc.setLineWidth(0.5);
  doc.line(14, startY + 2, 196, startY + 2);

  startY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  rows.forEach((row) => {
    if (startY > 270) {
      doc.addPage();
      startY = 20;
    }
    const displayName = row.fullName || row.email.split('@')[0];
    doc.text(displayName.substring(0, 30), 14, startY);
    doc.text(row.email, 85, startY);
    doc.text(row.mark.toString(), 165, startY);
    startY += 8;
  });

  doc.save(`${qpCode}_Report.pdf`);
}
