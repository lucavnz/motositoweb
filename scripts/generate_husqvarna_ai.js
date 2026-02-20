const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

// Setup Sanity Client
const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
});

async function main() {
    console.log("Inizializzo generazione AI per Husqvarna...");

    // Find the Brand ID for Husqvarna
    const brands = await client.fetch(`*[_type == "brand" && name match "Husqvarna"]{_id, name}`);
    if (brands.length === 0) {
        console.error("❌ Marchio Husqvarna non trovato in Sanity.");
        return;
    }
    const husqvarnaId = brands[0]._id;
    console.log(`✅ Trovato marchio Husqvarna (ID: ${husqvarnaId})`);

    // Fetch Husqvarna motorcycles that DO NOT have an AI generated description
    // Requirement text: "assicurati che se c'è una descrizione non generata AI cioè già prima ma non AI spuntata allora la sovrascrive ok?"
    // This means we select all bikes where `isAiGeneratedDescription != true`
    const bikes = await client.fetch(`
        *[_type == "motorcycle" && brand._ref == $brandId && isAiGeneratedDescription != true] {
            _id,
            model,
            year
        }
    `, { brandId: husqvarnaId });

    console.log(`🏍 Trovate ${bikes.length} moto Husqvarna che necessitano di generazione AI.`);

    if (bikes.length === 0) return;

    let successCount = 0;

    // We will call your Next.js API route directly to generate the description
    // To do this, we replicate the API logic slightly or call the API endpoint.
    // Calling the API endpoint requires the dev server to be running.
    // Since we are creating a script, it's safer to reproduce the logic to avoid HTTP overhead and timeouts.

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const modelName = 'gemini-2.5-flash';
    const generativeModel = genAI.getGenerativeModel({ model: modelName }); // No tools = NO GROUNDING

    for (const bike of bikes) {
        console.log(`\n⏳ Generazione in corso per: Husqvarna ${bike.model} (${bike.year}) [ID: ${bike._id}]...`);
        try {
            const prompt = `Cerca informazioni dettagliate sulla moto Husqvarna ${bike.model} del ${bike.year}.
            Scrivi una descrizione accattivante e informativa per un sito web di vendita moto.
            La descrizione deve essere lunga il giusto, non troppo prolissa ma nemmeno scarna (circa 100-150 parole).
            Includi dettagli tecnici rilevanti (cilindrata, cavalli, tipologia) e caratteristiche distintive.
            Usa un tono professionale ma appassionato.
            Rispondi SOLO con il testo della descrizione, niente altro.`;

            const result = await generativeModel.generateContent(prompt);
            const description = await result.response.text();

            console.log(`✅ Descrizione generata (${description.length} caratteri), salvo su Sanity...`);

            // Patch the document
            await client.patch(bike._id).set({
                shortDescription: description,
                isAiGeneratedDescription: true
            }).commit();

            console.log(`💾 Salvataggio completato per: ${bike.model}`);
            successCount++;

            // Wait 1.5 seconds between requests to avoid any API rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.error(`❌ Errore durante l'elaborazione di ${bike.model}:`, error.message);
        }
    }

    console.log(`\n🎉 Processo completato! Generate con successo ${successCount}/${bikes.length} descrizioni.`);
}

main().catch(console.error);
