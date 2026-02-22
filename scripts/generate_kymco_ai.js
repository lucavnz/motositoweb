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

const MODEL_SEQUENCE = [
    ...Array(4).fill('gemini-2.5-flash'),
    ...Array(8).fill('gemini-2.5-flash-lite'),
    ...Array(4).fill('gemini-3-flash-preview'),
];

async function main() {
    console.log("Inizializzo generazione AI per KYMCO Nuovi...");

    const brands = await client.fetch(`*[_type == "brand" && name match "KYMCO"]{_id, name}`);
    if (brands.length === 0) {
        console.error("❌ Marchio KYMCO non trovato in Sanity.");
        return;
    }
    const kymcoId = brands[0]._id;
    console.log(`✅ Trovato marchio KYMCO (ID: ${kymcoId})`);

    const bikes = await client.fetch(`
        *[_type == "motorcycle" && brand._ref == $brandId && condition == "nuova" && isAiGeneratedDescription != true] {
            _id,
            model,
            year
        }
    `, { brandId: kymcoId });

    console.log(`🛵 Trovati ${bikes.length} scooter KYMCO nuovi che necessitano di generazione AI.`);

    if (bikes.length === 0) return;

    let successCount = 0;
    let currentKeyIndex = 0;
    let currentModelIndexInSequence = 0;

    for (let i = 0; i < bikes.length; i++) {
        const bike = bikes[i];
        const currentApiKey = API_KEYS[currentKeyIndex];
        const currentModelName = MODEL_SEQUENCE[currentModelIndexInSequence];

        const genAI = new GoogleGenerativeAI(currentApiKey);
        const generativeModel = genAI.getGenerativeModel({ model: currentModelName });

        console.log(`\n⏳ Generazione in corso per: KYMCO ${bike.model} (${bike.year}) [ID: ${bike._id}]`);
        console.log(`   🔑 API Key: ${currentKeyIndex + 1}/${API_KEYS.length} | 🤖 Modello: ${currentModelName} (${currentModelIndexInSequence + 1}/${MODEL_SEQUENCE.length})`);

        let success = false;
        try {
            const prompt = `Cerca informazioni dettagliate sullo scooter KYMCO ${bike.model} del ${bike.year}.
            Scrivi una descrizione accattivante e informativa per un sito web di vendita scooter.
            La descrizione deve essere lunga il giusto, non troppo prolissa ma nemmeno scarna (circa 100-150 parole).
            Includi dettagli tecnici rilevanti (cilindrata, cavalli, tipologia) e caratteristiche distintive.
            Usa un tono professionale ma appassionato.
            Rispondi SOLO con il testo della descrizione, niente altro. Non includere formattazione Markdown o asterischi. Non includere titoli.`;

            const result = await generativeModel.generateContent(prompt);
            const description = await result.response.text();

            console.log(`✅ Descrizione generata (${description.length} caratteri), salvo su Sanity...`);

            await client.patch(bike._id).set({
                shortDescription: description.trim(),
                isAiGeneratedDescription: true
            }).commit();

            console.log(`💾 Salvataggio completato per: ${bike.model}`);
            successCount++;
            success = true;

            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.error(`❌ Errore durante l'elaborazione di ${bike.model} con il modello ${currentModelName}:`, error.message);
            console.log(`⏩ Passo subito al prossimo modello/chiave per riprovare lo stesso scooter...`);
        }

        currentModelIndexInSequence++;

        if (currentModelIndexInSequence >= MODEL_SEQUENCE.length) {
            currentModelIndexInSequence = 0;
            currentKeyIndex++;
            console.log(`\n🔄 Ciclo modelli completato! Passo alla prossima API KEY.`);

            if (currentKeyIndex >= API_KEYS.length) {
                currentKeyIndex = 0;
                console.log(`🔄 Ciclo API Keys terminato. Ricomincio dalla prima API KEY.`);
            }
        }

        if (!success) {
            i--;
        }
    }

    console.log(`\n🎉 Processo completato! Generate con successo ${successCount}/${bikes.length} descrizioni per KYMCO.`);
}

main().catch(console.error);
