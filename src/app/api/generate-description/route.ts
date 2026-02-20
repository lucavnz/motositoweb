import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_API_KEY as string; // Provided by user
const genAI = new GoogleGenerativeAI(API_KEY);

interface RequestBody {
    brand: string;
    model: string;
    year: number;
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json();
        const { brand, model, year } = body;

        if (!brand || !model || !year) {
            return NextResponse.json(
                { error: 'Marca, modello e anno sono obbligatori' },
                { status: 400 }
            );
        }

        const modelName = 'gemini-3-flash';

        const generativeModel = genAI.getGenerativeModel({
            model: modelName,
        });

        const prompt = `Cerca informazioni dettagliate sulla moto ${brand} ${model} del ${year}.
    Scrivi una descrizione accattivante e informativa per un sito web di vendita moto.
    La descrizione deve essere lunga il giusto, non troppo prolissa ma nemmeno scarna (circa 100-150 parole).
    Includi dettagli tecnici rilevanti (cilindrata, cavalli, tipologia) e caratteristiche distintive.
    Usa un tono professionale ma appassionato.
    Rispondi SOLO con il testo della descrizione, niente altro.`;

        const result = await generativeModel.generateContent(prompt);
        const response = await result.response;
        const description = response.text();
        const usageMetadata = response.usageMetadata;

        // Pricing estimation for Gemini 3 Flash
        // Approx: Input $0.10 / 1M, Output $0.40 / 1M. Grounding removed.

        const inputPricePerMillion = 0.10;
        const outputPricePerMillion = 0.40;
        const groundingPricePerRequest = 0; // Removed Grounding

        const inputTokens = usageMetadata?.promptTokenCount || 0;
        const outputTokens = usageMetadata?.candidatesTokenCount || 0;
        const totalTokens = usageMetadata?.totalTokenCount || 0;

        const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
        const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;

        const groundingUsed = false;
        const groundingCost = 0;

        const totalCost = inputCost + outputCost + groundingCost;

        return NextResponse.json({
            success: true,
            description,
            model: modelName,
            usage: {
                inputTokens,
                outputTokens,
                totalTokens,
                groundingUsed
            },
            cost: {
                inputCost: `$${inputCost.toFixed(6)}`,
                outputCost: `$${outputCost.toFixed(6)}`,
                groundingCost: `$${groundingCost.toFixed(4)}`,
                totalCost: `$${totalCost.toFixed(6)}`
            }
        });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Errore durante la generazione della descrizione' },
            { status: 500 }
        );
    }
}
