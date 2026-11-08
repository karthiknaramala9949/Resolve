import { jsPDF } from 'jspdf';
import { Case } from '../db/types';
import { formatINR } from '../utils';

export function generateProofPackPDF(caseData: Case): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header Bar
  doc.setFillColor(200, 55, 45); // Brand Coral Red #C8372D
  doc.rect(40, y, pageWidth - 80, 4, 'F');
  y += 24;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text('RESOLVE-ONE · CONSUMER DISPUTE PROOF PACK', 40, y);
  y += 18;

  // Subtitle & Meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Case ID: ${caseData.id}  |  Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}  |  Jurisdiction: India`,
    40,
    y
  );
  y += 25;

  // Horizontal divider
  doc.setDrawColor(220, 220, 220);
  doc.line(40, y, pageWidth - 40, y);
  y += 20;

  // Section: Core Facts Summary Box
  doc.setFillColor(248, 246, 240); // Warm surface subtle
  doc.rect(40, y, pageWidth - 80, 85, 'F');
  doc.setDrawColor(230, 225, 215);
  doc.rect(40, y, pageWidth - 80, 85, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(200, 55, 45);
  doc.text('DISPUTE SUMMARY', 52, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  doc.text(`Company / Merchant: ${caseData.company || 'Not specified'}`, 52, y + 36);
  doc.text(`Product / Service: ${caseData.product || 'Not specified'}`, 52, y + 52);
  doc.text(`Order Reference: ${caseData.orderRef || 'Not specified'}`, 52, y + 68);

  doc.text(`Issue Category: ${caseData.issueType}`, 320, y + 36);
  doc.text(`Claim Amount: ${formatINR(caseData.amount)}`, 320, y + 52);
  doc.text(`Desired Outcome: ${caseData.desiredOutcome || 'Refund'}`, 320, y + 68);

  y += 105;

  // Section: Consumer Statement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('STATEMENT OF FACTS', 40, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);

  const splitDesc = doc.splitTextToSize(caseData.description || 'No description provided.', pageWidth - 80);
  doc.text(splitDesc, 40, y);
  y += splitDesc.length * 13 + 15;

  // Section: Chronological Timeline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('CHRONOLOGICAL EVENT LOG', 40, y);
  y += 16;

  const events = caseData.timeline || [];
  if (events.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No timeline events recorded.', 40, y);
    y += 18;
  } else {
    doc.setFontSize(9);
    for (const ev of events.slice(0, 8)) {
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      const dateStr = new Date(ev.at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.text(`• ${dateStr} - ${ev.title} (${ev.source})`, 48, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 90, 90);
      const splitDetail = doc.splitTextToSize(ev.detail, pageWidth - 100);
      doc.text(splitDetail, 58, y);
      y += splitDetail.length * 11 + 6;
    }
  }

  y += 15;

  // Section: Evidence Index with Cryptographic Fingerprints
  if (y > 660) {
    doc.addPage();
    y = 50;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text('EVIDENCE INDEX & CRYPTOGRAPHIC VERIFICATION', 40, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Each evidence file is fingerprinted locally via SHA-256 hash. Matches prove the file content has not been altered.',
    40,
    y
  );
  y += 16;

  const evidenceList = caseData.evidence || [];
  if (evidenceList.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('No binary evidence files linked to this case.', 40, y);
    y += 20;
  } else {
    for (const ev of evidenceList) {
      if (y > 730) {
        doc.addPage();
        y = 50;
      }

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.rect(40, y, pageWidth - 80, 36, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(`${ev.name} (${(ev.size / 1024).toFixed(1)} KB, ${ev.mime})`, 50, y + 14);

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`SHA-256: ${ev.sha256 || 'Hash not calculated'}`, 50, y + 26);

      y += 44;
    }
  }

  // Footer / Disclaimer
  const footerY = doc.internal.pageSize.getHeight() - 35;
  doc.setDrawColor(230, 230, 230);
  doc.line(40, footerY - 10, pageWidth - 40, footerY - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(
    'Self-generated consumer proof pack prepared via RESOLVE-ONE (resolve.one). Informational grievance dossier. Not legal representation.',
    40,
    footerY
  );

  return doc;
}

