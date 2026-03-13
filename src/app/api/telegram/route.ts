import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getNextApiKey } from '@/lib/apiKeyManager';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ─── Sessioni in-memory (per Vercel: reset ad ogni cold start, ok per UX) ───
interface Session {
  phase: 'idle' | 'awaiting_selection';
  candidates?: string[];    // modelli proposti
  originalText?: string;    // testo originale dell'utente
  lastActivity: number;
}

const sessions = new Map<number, Session>();

// Pulisci sessioni vecchie (> 30 min)
function cleanSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > 30 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}

// ─── Telegram helpers ───
async function sendMessage(chatId: number, text: string, parseMode: string = 'Markdown') {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
  } catch (err) {
    // Se Markdown fallisce, riprova in plain text
    if (parseMode === 'Markdown') {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/[*_`\[\]()~>#+\-=|{}.!]/g, ''),
        }),
      });
    }
  }
}

async function sendChatAction(chatId: number) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  });
}

// ─── Gemini AI ───
async function callGemini(prompt: string, useGrounding: boolean = true): Promise<string> {
  const apiKey = await getNextApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const tools: any[] = [];
  if (useGrounding) {
    tools.push({ googleSearch: {} });
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-05-20',
    tools,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

// ─── Prompt Templates ───
const SYSTEM_CONTEXT = `Sei un esperto valutatore di moto usate per una concessionaria italiana (Avanzi Moto).
Il tuo compito è aiutare il concessionario a valutare moto da ritirare in permuta.
Rispondi SEMPRE in italiano. Sii preciso, professionale e conciso.`;

function buildIdentificationPrompt(userText: string): string {
  return `${SYSTEM_CONTEXT}

L'utente ha scritto questo messaggio per descrivere una moto da valutare:
"${userText}"

STEP 1 - VERIFICA DATI:
Controlla se il messaggio contiene TUTTI e 4 questi dati essenziali:
- Marchio (es. KTM, Yamaha, Honda, Ducati, BMW...)
- Modello (es. Super Duke, MT-07, CBR 600, Monster...)
- Anno di immatricolazione
- Chilometraggio approssimativo

Se manca uno o più dati, rispondi SOLO con un messaggio che elenca cosa manca, in questo formato:
"⚠️ *Per valutare la moto ho bisogno di:*
• [dato mancante 1]
• [dato mancante 2]

Esempio: _KTM 1290 Super Duke R del 2021, 18.000 km_"

NON procedere alla valutazione se mancano dati.

STEP 2 - IDENTIFICAZIONE MODELLO:
Se ci sono tutti i dati, cerca il modello esatto. Considera che l'utente potrebbe scrivere in modo impreciso.
- Se il modello è chiaro e univoco (un solo allestimento/versione possibile), rispondi con:
"MODELLO_UNICO: [marchio] [modello esatto completo] [anno]"

- Se ci sono più versioni/allestimenti possibili per quel modello e anno, elencali tutti in questo formato:
"MODELLI_MULTIPLI:
1. [Marchio] [Modello versione 1] ([differenza chiave])
2. [Marchio] [Modello versione 2] ([differenza chiave])
3. ..."

Sii accurato nell'identificare le varie versioni (es. KTM 1290 Super Duke R vs GT vs EVO, Yamaha MT-07 vs MT-07 A2, ecc).`;
}

function buildValuationPrompt(
  brand: string,
  model: string,
  year: string,
  km: string,
  originalText: string
): string {
  return `${SYSTEM_CONTEXT}

Devi valutare questa moto per una permuta:
- Marchio: ${brand}
- Modello: ${model}
- Anno: ${year}
- Chilometri: ${km}
- Descrizione originale dell'utente: "${originalText}"

USA LA RICERCA GOOGLE per trovare:
1. Il prezzo medio di vendita dell'usato per questo modello con anno e km simili (cerca su siti come moto.it, subito.it, autoscout24.it)
2. Il prezzo di listino del modello nuovo equivalente 2026 (o dell'ultimo anno disponibile)

Poi calcola il PREZZO DI RITIRO IN PERMUTA, che è tipicamente il 60-75% del valore di vendita dell'usato (il concessionario deve avere margine).

Rispondi in questo formato ESATTO:

🏍️ *VALUTAZIONE PERMUTA*

*Moto:* [Marchio Modello Completo]
*Anno:* [anno]
*Chilometri:* [km]

━━━━━━━━━━━━━━━━━━

💰 *VALORE USATO MERCATO*
Prezzo medio vendita: €[prezzo_min] - €[prezzo_max]

🔄 *RITIRO IN PERMUTA*
Valore consigliato ritiro: *€[prezzo_min_permuta] - €[prezzo_max_permuta]*

🆕 *MODELLO NUOVO 2026*
[Nome modello nuovo equivalente]: €[prezzo_listino_nuovo]

━━━━━━━━━━━━━━━━━━

📊 *FATTORI CONSIDERATI*
• Chilometraggio: [commento breve]
• Anno/Anzianità: [commento breve]
• Domanda di mercato: [commento breve]
• Stato generale stimato: [commento breve]

⚠️ _Valutazione indicativa basata sui prezzi di mercato attuali. Il valore finale dipende dalle condizioni reali della moto._`;
}

// ─── Logica principale ───
async function handleMessage(chatId: number, text: string) {
  cleanSessions();

  const lowerText = text.trim().toLowerCase();

  // Comandi speciali
  if (lowerText === '/start') {
    await sendMessage(chatId,
      `🏍️ *Benvenuto nel Valutatore Moto Avanzi!*

Sono il tuo assistente per valutare le moto in permuta.

📝 *Come funziona:*
Scrivimi le info della moto e ti darò una valutazione!

Devo sapere:
• *Marchio* (KTM, Yamaha, Honda...)
• *Modello* (Super Duke, MT-07...)
• *Anno*
• *Chilometri*

✏️ *Esempio:*
_KTM 1290 Super Duke R del 2021, 18.000 km_
_Yamaha MT-07 2019 25000km_
_Honda CBR 600 RR anno 2018, 32.000 chilometri_

Scrivi pure in modo naturale, ci penso io! 💪`
    );
    return;
  }

  if (lowerText === '/help') {
    await sendMessage(chatId,
      `ℹ️ *Guida rapida*

Scrivimi marca, modello, anno e km di una moto e ti farò una valutazione di permuta.

*Comandi:*
/start - Messaggio di benvenuto
/help - Questa guida
/reset - Azzera conversazione`
    );
    return;
  }

  if (lowerText === '/reset') {
    sessions.delete(chatId);
    await sendMessage(chatId, '🔄 Conversazione azzerata. Scrivi i dati di una nuova moto!');
    return;
  }

  const session = sessions.get(chatId);

  // FASE: L'utente sta selezionando un modello dalla lista
  if (session?.phase === 'awaiting_selection' && session.candidates) {
    const selection = parseInt(text.trim());
    if (isNaN(selection) || selection < 1 || selection > session.candidates.length) {
      await sendMessage(chatId,
        `❌ Scegli un numero da 1 a ${session.candidates.length}, oppure scrivi /reset per ricominciare.`
      );
      return;
    }

    const selectedModel = session.candidates[selection - 1];
    await sendChatAction(chatId);
    await sendMessage(chatId, `✅ Hai scelto: *${selectedModel}*\n\n⏳ _Sto analizzando il mercato e calcolando la valutazione..._`);
    await sendChatAction(chatId);

    try {
      // Estrai dati dal testo originale per il prompt di valutazione
      const yearMatch = session.originalText?.match(/\b(20[0-2]\d)\b/);
      const kmMatch = session.originalText?.match(/(\d[\d.]*)\s*(?:mila\s*)?(?:km|chilometri|000)/i);

      const year = yearMatch ? yearMatch[1] : 'non specificato';
      let km = 'non specificato';
      if (kmMatch) {
        let kmNum = kmMatch[1].replace(/\./g, '');
        if (session.originalText?.toLowerCase().includes('mila')) {
          kmNum = String(parseInt(kmNum) * 1000);
        }
        // Handle "18milakm" style
        if (/\d+mila/i.test(session.originalText || '')) {
          const milaMatch = session.originalText?.match(/(\d+)mila/i);
          if (milaMatch) kmNum = String(parseInt(milaMatch[1]) * 1000);
        }
        km = kmNum;
      }

      const brandMatch = selectedModel.match(/^(\w+)/);
      const brand = brandMatch ? brandMatch[1] : '';

      const valuation = await callGemini(
        buildValuationPrompt(brand, selectedModel, year, km, session.originalText || ''),
        true
      );

      sessions.delete(chatId);
      await sendMessage(chatId, valuation);
    } catch (error: any) {
      console.error('Valuation error:', error);
      await sendMessage(chatId, '❌ Errore durante la valutazione. Riprova tra poco!');
      sessions.delete(chatId);
    }
    return;
  }

  // FASE: Nuovo messaggio – identificazione moto
  await sendChatAction(chatId);

  try {
    const aiResponse = await callGemini(buildIdentificationPrompt(text), true);

    // Caso: Modello unico identificato → vai diretto alla valutazione
    if (aiResponse.includes('MODELLO_UNICO:')) {
      const modelLine = aiResponse.split('MODELLO_UNICO:')[1].trim().split('\n')[0];
      await sendMessage(chatId, `✅ Modello identificato: *${modelLine}*\n\n⏳ _Sto analizzando il mercato e calcolando la valutazione..._`);
      await sendChatAction(chatId);

      const yearMatch = text.match(/\b(20[0-2]\d)\b/) || text.match(/\b(19\d{2})\b/);
      const kmMatch = text.match(/(\d[\d.]*)\s*(?:mila\s*)?(?:km|chilometri|000)/i);

      const year = yearMatch ? yearMatch[1] : 'non specificato';
      let km = 'non specificato';
      if (kmMatch) {
        let kmNum = kmMatch[1].replace(/\./g, '');
        if (/\d+mila/i.test(text)) {
          const milaMatch = text.match(/(\d+)mila/i);
          if (milaMatch) kmNum = String(parseInt(milaMatch[1]) * 1000);
        }
        km = kmNum;
      }

      const brandMatch = modelLine.match(/^(\w+)/);
      const brand = brandMatch ? brandMatch[1] : '';

      const valuation = await callGemini(
        buildValuationPrompt(brand, modelLine, year, km, text),
        true
      );

      sessions.delete(chatId);
      await sendMessage(chatId, valuation);
      return;
    }

    // Caso: Modelli multipli → chiedi selezione
    if (aiResponse.includes('MODELLI_MULTIPLI:')) {
      const modelsSection = aiResponse.split('MODELLI_MULTIPLI:')[1].trim();
      const modelLines = modelsSection
        .split('\n')
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.trim().replace(/^\d+\.\s*/, ''));

      if (modelLines.length > 0) {
        sessions.set(chatId, {
          phase: 'awaiting_selection',
          candidates: modelLines,
          originalText: text,
          lastActivity: Date.now(),
        });

        let responseText = `🔍 *Ho trovato più versioni possibili:*\n\n`;
        modelLines.forEach((model: string, i: number) => {
          responseText += `*${i + 1}.* ${model}\n`;
        });
        responseText += `\n📌 _Rispondi con il numero del modello corretto_`;

        await sendMessage(chatId, responseText);
        return;
      }
    }

    // Caso: Dati mancanti o risposta generica dall'AI
    sessions.set(chatId, { phase: 'idle', lastActivity: Date.now() });
    await sendMessage(chatId, aiResponse);

  } catch (error: any) {
    console.error('Identification error:', error);
    await sendMessage(chatId, '❌ Errore nella comunicazione con l\'AI. Riprova tra poco!');
  }
}

// ─── Next.js API Route ───
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Gestisci solo messaggi di testo
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = message.text;

    // Processa in background (non bloccare il webhook)
    // Vercel ha max 60s su hobby, 300s su pro
    await handleMessage(chatId, text);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Sempre 200 a Telegram
  }
}

// GET per verifica che l'endpoint esista
export async function GET() {
  return NextResponse.json({
    status: 'active',
    bot: 'Avanzi Moto Valutatore',
  });
}
