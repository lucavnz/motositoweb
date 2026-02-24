const { createClient } = require('@sanity/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

// Setup Sanity Client
const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
});

const API_KEYS = [
    process.env.GOOGLE_API_KEY_1,
    process.env.GOOGLE_API_KEY_2,
    process.env.GOOGLE_API_KEY_3,
].filter(Boolean);

if (API_KEYS.length === 0) {
    console.error("❌ Nessuna GOOGLE_API_KEY_1/2/3 trovata in .env.local");
    process.exit(1);
}

// Rotation Sequence:
// 1 key -> 4x gemini-2.5-flash -> 8x gemini-2.5-flash-lite -> 4x gemini-3-flash-preview
// Then Next key.
const MODEL_SEQUENCE = [
    ...Array(4).fill('gemini-2.5-flash'),
    ...Array(8).fill('gemini-2.5-flash-lite'),
    ...Array(4).fill('gemini-3-flash-preview'),
];

async function main() {
    console.log("🏍 Inizializzo generazione AI per MOTO USATE...\n");

    // Fetch ALL used motorcycles that DO NOT have an AI generated description
    const bikes = await client.fetch(`
        *[_type == "motorcycle" && condition == "usata" && isAiGeneratedDescription != true] {
            _id,
            model,
            year,
            kilometers,
            cilindrata,
            price,
            type,
            brand-> { name }
        }
    `);

    console.log(`🏍 Trovate ${bikes.length} moto usate che necessitano di generazione AI.`);

    if (bikes.length === 0) {
        console.log("✅ Tutte le moto usate hanno già una descrizione AI!");
        return;
    }

    let successCount = 0;
    let currentKeyIndex = 0;
    let currentModelIndexInSequence = 0;

    for (let i = 0; i < bikes.length; i++) {
        const bike = bikes[i];
        const brandName = bike.brand?.name || 'Sconosciuto';

        // Select current API Key and Model
        const currentApiKey = API_KEYS[currentKeyIndex];
        const currentModelName = MODEL_SEQUENCE[currentModelIndexInSequence];

        const genAI = new GoogleGenerativeAI(currentApiKey);
        const generativeModel = genAI.getGenerativeModel({ model: currentModelName });

        console.log(`\n⏳ Generazione in corso per: ${brandName} ${bike.model} (${bike.year}) [ID: ${bike._id}]`);
        console.log(`   📊 Km: ${bike.kilometers || 'N/D'} | Cilindrata: ${bike.cilindrata || 'N/D'}cc | Tipo: ${bike.type || 'N/D'}`);
        console.log(`   🔑 API Key: ${currentKeyIndex + 1}/${API_KEYS.length} | 🤖 Modello: ${currentModelName} (${currentModelIndexInSequence + 1}/${MODEL_SEQUENCE.length})`);

        let success = false;
        try {
            // Build context info for the prompt
            let contextInfo = `moto usata ${brandName} ${bike.model} del ${bike.year}`;
            if (bike.kilometers) contextInfo += `, con ${bike.kilometers} km percorsi`;
            if (bike.cilindrata) contextInfo += `, cilindrata ${bike.cilindrata}cc`;
            if (bike.type) contextInfo += `, tipologia ${bike.type}`;

            const prompt = `Cerca informazioni dettagliate sulla ${contextInfo}.
            Scrivi una descrizione accattivante e informativa per un sito web di vendita moto USATE.
            La descrizione deve essere lunga il giusto, non troppo prolissa ma nemmeno scarna (circa 100-150 parole).
            Includi dettagli tecnici rilevanti (cilindrata, cavalli, tipologia) e caratteristiche distintive del modello.
            Sottolinea i punti di forza della moto e perché potrebbe essere un ottimo acquisto come moto usata.
            Usa un tono professionale ma appassionato.
            Rispondi SOLO con il testo della descrizione, niente altro. Non includere formattazione Markdown o asterischi. Non includere titoli.`;

            const result = await generativeModel.generateContent(prompt);
            const description = await result.response.text();

            console.log(`✅ Descrizione generata (${description.length} caratteri), salvo su Sanity...`);

            // Patch the document
            await client.patch(bike._id).set({
                shortDescription: description.trim(),
                isAiGeneratedDescription: true
            }).commit();

            console.log(`💾 Salvataggio completato per: ${brandName} ${bike.model}`);
            successCount++;
            success = true;

            // Wait a bit to avoid API limits (1.5 seconds)
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.error(`❌ Errore durante l'elaborazione di ${brandName} ${bike.model} con il modello ${currentModelName}:`, error.message);
            console.log(`⏩ Passo subito al prossimo modello/chiave per riprovare la stessa moto...`);
        }

        // Advance indices
        currentModelIndexInSequence++;

        // If we finished the 16 requests for the current key...
        if (currentModelIndexInSequence >= MODEL_SEQUENCE.length) {
            currentModelIndexInSequence = 0;
            currentKeyIndex++;
            console.log(`\n🔄 Ciclo modelli completato! Passo alla prossima API KEY.`);

            // Loop back to first API key if we reach the end
            if (currentKeyIndex >= API_KEYS.length) {
                currentKeyIndex = 0;
                console.log(`🔄 Ciclo API Keys terminato. Ricomincio dalla prima API KEY (Indice 1).`);
            }
        }

        // If it failed, don't increment i, so the loop tries the *same bike* again next iteration
        if (!success) {
            i--;
        }
    }

    console.log(`\n🎉 Processo completato! Generate con successo ${successCount}/${bikes.length} descrizioni per moto usate.`);
}

main().catch(console.error);
