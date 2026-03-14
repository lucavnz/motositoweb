import { generateValuationPDF } from './src/app/api/telegram/generatePdf';

async function test() {
  const data = {
    moto: "KTM 1290 Super Duke R",
    anno: "2021",
    km: "18000",
    mercato_usato: { min: 11500, max: 13000 },
    permuta_consigliata: { min: 7500, max: 9000 },
    analisi_dettagliata: {
      rivendibilita: "Alta",
      pro_mercato: ["Motore molto richiesto"],
      contro_mercato: ["Tagliando costoso"],
      svalutazione_annua_stimata: "8-10%",
      note_operatore: "Note"
    }
  };
  
  try {
    const buf = await generateValuationPDF(data);
    console.log("PDF generated, size:", buf.length);
  } catch (err) {
    console.error("PDF generation failed:", err);
  }
}

test();
