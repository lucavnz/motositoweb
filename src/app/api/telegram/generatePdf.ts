/**
 * Telegram Bot PDF Generator
 * Crea una valutazione professionale in PDF usando jsPDF
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ValuationData {
  moto: string;
  anno: string;
  km: string;
  mercato_usato: {
    min: number;
    max: number;
  };
  permuta_consigliata: {
    min: number;
    max: number;
  };
  analisi_dettagliata: {
    rivendibilita: string;
    pro_mercato: string[];
    contro_mercato: string[];
    svalutazione_annua_stimata: string;
    note_operatore: string;
  };
}

export async function generateValuationPDF(data: ValuationData): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Colori Brand (Premium, moderno)
  const primaryColor: [number, number, number] = [26, 54, 93]; // Dark Blue
  const accentColor: [number, number, number] = [226, 57, 70];  // Red accent
  const lightBg: [number, number, number] = [240, 244, 248];

  // ── Header Banner (Moderno) ──
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('AVANZI MOTO', 14, 24);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 220);
  doc.text('Scheda Valutazione Usato', 14, 32);

  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, pageWidth - 40, 32);

  // ── Dati Veicolo (Stile Card) ──
  let cursorY = 55;
  doc.setTextColor(20, 30, 40);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const motoUpper = data.moto.toUpperCase();
  doc.text(motoUpper, 14, cursorY);

  cursorY += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 90, 100);
  doc.text(`Anno Registrazione: ${data.anno}  |  Chilometraggio: ${data.km} km`, 14, cursorY);

  cursorY += 10;
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.5);
  doc.line(14, cursorY, pageWidth - 14, cursorY);

  // ── Tabelle Economiche (Stile pulito e moderno) ──
  cursorY += 10;
  const formatEuro = (val: number) => `\u20AC ${val.toLocaleString('it-IT')}`;

  autoTable(doc, {
    startY: cursorY,
    head: [['ANALISI DEL VALORE', 'MINIMO ESTIMATO', 'MASSIMO ESTIMATO']],
    body: [
      ['Valore Mercato Usato (Privati/Dealer)', formatEuro(data.mercato_usato.min), formatEuro(data.mercato_usato.max)],
      ['Valore Permuta (Ritiro Consigliato)', formatEuro(data.permuta_consigliata.min), formatEuro(data.permuta_consigliata.max)],
    ],
    theme: 'plain', // Più elegante, no griglia pesante
    headStyles: {
      fillColor: lightBg,
      textColor: primaryColor,
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 12,
      textColor: [40, 50, 60]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 90 },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right', fontStyle: 'bold', textColor: accentColor } // Prezzo max in accento
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252]
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // ── Analisi Dettagliata AI (Titolo di sezione) ──
  doc.setTextColor(20, 30, 40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Analisi di Mercato Avanzata', 14, finalY);

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(14, finalY + 4, 60, finalY + 4); // Linea corta stile moderno

  cursorY = finalY + 15;
  const lineSpacing = 7;

  doc.setFontSize(11);
  doc.setTextColor(40, 50, 60);

  // Rivendibilità
  doc.setFont('helvetica', 'bold');
  doc.text('Rivendibilita stimata:', 14, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.analisi_dettagliata.rivendibilita, 55, cursorY);
  cursorY += lineSpacing;

  // Svalutazione
  doc.setFont('helvetica', 'bold');
  doc.text('Svalutazione annua:', 14, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.analisi_dettagliata.svalutazione_annua_stimata, 58, cursorY);
  cursorY += lineSpacing + 6;

  // ── Pro & Contro (Cards arrotondate moderne) ──
  const cardWidth = 85;
  const cardHeight = 60;

  // PRO Card
  doc.setFillColor(242, 252, 242); // Sfondo verde leggerissimo
  doc.roundedRect(14, cursorY, cardWidth, cardHeight, 3, 3, 'F');

  doc.setTextColor(30, 100, 50); // Verde scuro testo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PUNTI DI FORZA MERCATO', 18, cursorY + 8);

  doc.setTextColor(60, 70, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let proY = cursorY + 16;
  data.analisi_dettagliata.pro_mercato.forEach((pro) => {
    const split = doc.splitTextToSize(`• ${pro}`, cardWidth - 8);
    doc.text(split, 18, proY);
    proY += split.length * 4.5;
  });

  // CONTRO Card
  doc.setFillColor(255, 245, 245); // Sfondo rosso leggerissimo
  doc.roundedRect(110, cursorY, cardWidth, cardHeight, 3, 3, 'F');

  doc.setTextColor(180, 40, 40); // Rosso scuro testo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RISCHI / PUNTI DEBOLI', 114, cursorY + 8);

  doc.setTextColor(60, 70, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let controY = cursorY + 16;
  data.analisi_dettagliata.contro_mercato.forEach((contro) => {
    const split = doc.splitTextToSize(`• ${contro}`, cardWidth - 8);
    doc.text(split, 114, controY);
    controY += split.length * 4.5;
  });

  cursorY += cardHeight + 12;

  // Note per il venditore (Box finale evidenziato)
  doc.setFillColor(246, 248, 250); // Sfondo grigio minimale
  doc.roundedRect(14, cursorY, pageWidth - 28, 30, 3, 3, 'F');

  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTE OPERATIVE PER ACCETTAZIONE:', 18, cursorY + 8);

  doc.setTextColor(60, 70, 80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const splitNotes = doc.splitTextToSize(data.analisi_dettagliata.note_operatore, pageWidth - 36);
  doc.text(splitNotes, 18, cursorY + 15);

  // Buffer
  return Buffer.from(doc.output('arraybuffer'));
}
