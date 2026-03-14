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

async function sendMessage(
  chatId: number,
  text: string,
  options: {
    replyMarkup?: object;
  } = {}
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (options.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram sendMessage error]', data.description);
      // Fallback: riprova senza HTML
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/<[^>]*>/g, ''),
          ...(options.replyMarkup && { reply_markup: options.replyMarkup }),
        }),
      });
    }
  } catch (err) {
    console.error('[Telegram sendMessage exception]', err);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || undefined,
    }),
  });
}

async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  options: { replyMarkup?: object } = {}
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (options.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendChatAction(chatId: number) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  });
}

// Mantieni l'indicatore "typing" vivo durante operazioni lunghe
function keepTyping(chatId: number): NodeJS.Timeout {
  return setInterval(() => sendChatAction(chatId), 4000);
}

// ─── Inline Keyboard Builders ───

function buildModelSelectionKeyboard(models: string[]) {
  return {
    inline_keyboard: models.map((model, i) => [
      { text: `${i + 1}. ${model}`, callback_data: `sel:${i}` },
    ]),
  };
}

function buildPostValuationKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🔄 Nuova valutazione', callback_data: 'action:new' },
        { text: '📞 Contattaci', url: 'https://wa.me/393400000000' }, // Aggiorna con numero reale
      ],
      [
        { text: '🌐 Vai al sito', url: 'https://www.avanzimoto.it' },
      ],
    ],
  };
}

function buildStartKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📝 Inizia una valutazione', callback_data: 'action:new' }],
      [{ text: 'ℹ️ Come funziona', callback_data: 'action:help' }],
    ],
  };
}

// ─── Gemini AI ───
async function callGemini(prompt: string): Promise<string> {
  const apiKey = await getNextApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Gemini Error]', message);
    throw err;
  }
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
"⚠️ Per valutare la moto ho bisogno di:
• [dato mancante 1]
• [dato mancante 2]

Esempio: KTM 1290 Super Duke R del 2021, 18.000 km"

NON procedere alla valutazione se mancano dei dati.

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

Rispondi in questo formato ESATTO (usa TAG HTML per formattare, NON usare Markdown):

🏍️ <b>VALUTAZIONE PERMUTA</b>

<b>Moto:</b> [Marchio Modello Completo]
<b>Anno:</b> [anno]
<b>Km:</b> [km]

━━━━━━━━━━━━━━━━━━

💰 <b>VALORE USATO MERCATO</b>
Prezzo medio vendita: <b>€[prezzo_min] - €[prezzo_max]</b>

🔄 <b>RITIRO IN PERMUTA</b>
Valore consigliato: <b>€[prezzo_min_permuta] - €[prezzo_max_permuta]</b>

🆕 <b>MODELLO NUOVO 2026</b>
[Nome modello nuovo equivalente]: <b>€[prezzo_listino_nuovo]</b>

━━━━━━━━━━━━━━━━━━

📊 <b>FATTORI CONSIDERATI</b>
▫️ Km: [commento breve]
▫️ Anzianità: [commento breve]
▫️ Mercato: [commento breve]
▫️ Stato: [commento breve]

⚠️ <i>Valutazione indicativa basata sui prezzi di mercato attuali. Il valore finale dipende dalle condizioni reali della moto.</i>

IMPORTANTE: Usa SOLO tag HTML (<b>, <i>, <code>) per la formattazione. NON usare asterischi, underscore o altra formattazione Markdown.`;
}

// ─── Estrai anno e km dal testo ───
function extractYearAndKm(text: string): { year: string; km: string } {
  const yearMatch = text.match(/\b(20[0-2]\d)\b/) || text.match(/\b(19\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : 'non specificato';

  let km = 'non specificato';
  const kmMatch = text.match(/(\d[\d.]*)\s*(?:mila\s*)?(?:km|chilometri|000)/i);
  if (kmMatch) {
    let kmNum = kmMatch[1].replace(/\./g, '');
    if (/\d+mila/i.test(text)) {
      const milaMatch = text.match(/(\d+)mila/i);
      if (milaMatch) kmNum = String(parseInt(milaMatch[1]) * 1000);
    }
    if (text.toLowerCase().includes('mila')) {
      kmNum = String(parseInt(kmNum) * 1000);
    }
    km = kmNum;
  }

  return { year, km };
}

// ─── Esegui valutazione completa ───
async function performValuation(
  chatId: number,
  selectedModel: string,
  originalText: string
) {
  const typingInterval = keepTyping(chatId);

  try {
    const { year, km } = extractYearAndKm(originalText);
    const brandMatch = selectedModel.match(/^(\w+)/);
    const brand = brandMatch ? brandMatch[1] : '';

    const valuation = await callGemini(
      buildValuationPrompt(brand, selectedModel, year, km, originalText)
    );

    clearInterval(typingInterval);

    await sendMessage(chatId, valuation, {
      replyMarkup: buildPostValuationKeyboard(),
    });
  } catch (error: unknown) {
    clearInterval(typingInterval);
    const message = error instanceof Error ? error.message : String(error);
    console.error('Valuation error:', message);
    await sendMessage(
      chatId,
      '❌ <b>Errore durante la valutazione.</b>\n\nRiprova tra qualche secondo!',
      {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔄 Riprova', callback_data: 'action:new' }],
          ],
        },
      }
    );
  }
}

// ─── Logica principale: messaggio di testo ───
async function handleMessage(chatId: number, text: string) {
  cleanSessions();

  const lowerText = text.trim().toLowerCase();

  // ── Comando /start ──
  if (lowerText === '/start') {
    await sendMessage(
      chatId,
      `🏍️ <b>Valutatore Moto — Avanzi Moto</b>

Assistente rapido per valutazioni permuta.

━━━━━━━━━━━━━━━━━━

📝 <b>Come funziona</b>
Scrivi le info della moto e ricevi subito una valutazione di permuta basata sul mercato attuale.

<b>Servono 4 dati:</b>
▫️ Marchio
▫️ Modello
▫️ Anno
▫️ Chilometri

━━━━━━━━━━━━━━━━━━

✏️ <b>Esempio</b>
<code>KTM 1290 Super Duke R 2021 18000km</code>
<code>Yamaha MT-07 2019 25000km</code>
<code>Honda CBR 600 RR 2018 32000km</code>`,
      { replyMarkup: buildStartKeyboard() }
    );
    return;
  }

  // ── Comando /help ──
  if (lowerText === '/help') {
    await sendMessage(
      chatId,
      `ℹ️ <b>Guida rapida</b>

Scrivi <b>marca, modello, anno e km</b> di una moto e ricevi una valutazione di permuta.

<b>Comandi:</b>
/start — Messaggio di benvenuto
/help — Questa guida
/reset — Azzera conversazione`,
    );
    return;
  }

  // ── Comando /reset ──
  if (lowerText === '/reset') {
    sessions.delete(chatId);
    await sendMessage(
      chatId,
      '🔄 <b>Conversazione azzerata.</b>\n\nScrivi i dati di una moto per una nuova valutazione!',
    );
    return;
  }

  const session = sessions.get(chatId);

  // ── FASE: L'utente sta selezionando un modello dalla lista (fallback testo) ──
  if (session?.phase === 'awaiting_selection' && session.candidates) {
    const selection = parseInt(text.trim());
    if (isNaN(selection) || selection < 1 || selection > session.candidates.length) {
      await sendMessage(
        chatId,
        `❌ Scegli un numero da <b>1</b> a <b>${session.candidates.length}</b>, oppure scrivi /reset per ricominciare.`,
      );
      return;
    }

    const selectedModel = session.candidates[selection - 1];
    const originalText = session.originalText || '';
    sessions.delete(chatId);

    await sendMessage(
      chatId,
      `✅ <b>${selectedModel}</b>\n\n⏳ <i>Analisi del mercato in corso...</i>`,
    );

    await performValuation(chatId, selectedModel, originalText);
    return;
  }

  // ── FASE: Nuovo messaggio – identificazione moto ──
  await sendChatAction(chatId);
  const typingInterval = keepTyping(chatId);

  try {
    const aiResponse = await callGemini(buildIdentificationPrompt(text));
    clearInterval(typingInterval);

    // Caso: Modello unico identificato → vai diretto alla valutazione
    if (aiResponse.includes('MODELLO_UNICO:')) {
      const modelLine = aiResponse.split('MODELLO_UNICO:')[1].trim().split('\n')[0];

      await sendMessage(
        chatId,
        `✅ <b>${modelLine}</b>\n\n⏳ <i>Analisi del mercato in corso...</i>`,
      );

      sessions.delete(chatId);
      await performValuation(chatId, modelLine, text);
      return;
    }

    // Caso: Modelli multipli → inline keyboard per selezione
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

        await sendMessage(
          chatId,
          `🔍 <b>Più versioni trovate</b>\n\nSeleziona il modello corretto:`,
          { replyMarkup: buildModelSelectionKeyboard(modelLines) }
        );
        return;
      }
    }

    // Caso: Dati mancanti o risposta generica dall'AI
    sessions.set(chatId, { phase: 'idle', lastActivity: Date.now() });
    
    // L'AI risponde in Markdown, convertiamo per sicurezza
    const htmlResponse = aiResponse
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/_(.*?)_/g, '<i>$1</i>');
    
    await sendMessage(chatId, htmlResponse);

  } catch (error: unknown) {
    clearInterval(typingInterval);
    const message = error instanceof Error ? error.message : String(error);
    console.error('Identification error:', message);
    await sendMessage(
      chatId,
      '❌ <b>Errore nella comunicazione con l\'AI.</b>\n\nRiprova tra qualche secondo!',
      {
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🔄 Riprova', callback_data: 'action:new' }],
          ],
        },
      }
    );
  }
}

// ─── Logica principale: callback query (bottoni inline) ───
async function handleCallbackQuery(
  chatId: number,
  messageId: number,
  callbackQueryId: string,
  data: string
) {
  cleanSessions();

  // ── Selezione modello dalla lista ──
  if (data.startsWith('sel:')) {
    const index = parseInt(data.split(':')[1]);
    const session = sessions.get(chatId);

    if (!session?.candidates || index < 0 || index >= session.candidates.length) {
      await answerCallbackQuery(callbackQueryId, '⚠️ Sessione scaduta. Scrivi di nuovo i dati.');
      sessions.delete(chatId);
      return;
    }

    const selectedModel = session.candidates[index];
    const originalText = session.originalText || '';
    sessions.delete(chatId);

    await answerCallbackQuery(callbackQueryId, `✅ ${selectedModel}`);

    // Aggiorna il messaggio originale per mostrare la selezione
    await editMessageText(
      chatId,
      messageId,
      `✅ <b>${selectedModel}</b>\n\n⏳ <i>Analisi del mercato in corso...</i>`,
    );

    await performValuation(chatId, selectedModel, originalText);
    return;
  }

  // ── Azioni post-valutazione ──
  if (data === 'action:new') {
    sessions.delete(chatId);
    await answerCallbackQuery(callbackQueryId, '🔄 Pronto per una nuova valutazione!');
    await sendMessage(
      chatId,
      `🏍️ <b>Nuova valutazione</b>\n\nScrivi <b>marca, modello, anno e km</b> della moto da valutare.\n\n<i>Esempio:</i> <code>KTM 1290 Super Duke R 2021 18000km</code>`,
    );
    return;
  }

  if (data === 'action:help') {
    await answerCallbackQuery(callbackQueryId);
    await sendMessage(
      chatId,
      `ℹ️ <b>Come funziona</b>

Scrivi in chat le informazioni della moto da valutare e l'AI analizzerà il mercato per darti una stima di permuta.

<b>4 dati necessari:</b>
▫️ <b>Marchio</b> — es. KTM, Yamaha, Honda
▫️ <b>Modello</b> — es. Super Duke, MT-07
▫️ <b>Anno</b> — es. 2021
▫️ <b>Km</b> — es. 18.000

Se ci sono più versioni del modello, ti chiederò di scegliere con un bottone.

━━━━━━━━━━━━━━━━━━

📊 La valutazione include:
▫️ Valore di mercato usato
▫️ Range permuta consigliato (60-75%)
▫️ Prezzo del nuovo equivalente
▫️ Fattori analizzati`,
    );
    return;
  }

  // Fallback
  await answerCallbackQuery(callbackQueryId, 'Azione non riconosciuta');
}

// ─── Next.js API Route ───
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // ── Gestisci callback query (bottoni inline) ──
    if (update?.callback_query) {
      const cq = update.callback_query;
      const chatId: number = cq.message?.chat?.id;
      const messageId: number = cq.message?.message_id;
      const callbackQueryId: string = cq.id;
      const data: string = cq.data;

      if (chatId && data) {
        await handleCallbackQuery(chatId, messageId, callbackQueryId, data);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Gestisci messaggi di testo ──
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = message.chat.id;
    const text: string = message.text;

    await handleMessage(chatId, text);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Webhook error:', message);
    return NextResponse.json({ ok: true }); // Sempre 200 a Telegram
  }
}

// GET per verifica che l'endpoint esista
export async function GET() {
  return NextResponse.json({
    status: 'active',
    bot: 'Avanzi Moto Valutatore',
    version: '2.0',
  });
}
