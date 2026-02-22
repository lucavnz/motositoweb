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

async function processBrands() {
    console.log("\n==============================");
    console.log("Inizializzo SEO (standard) per i LOGHI BRAND...");
    const brands = await client.fetch(`*[_type == "brand" && defined(logo)]{_id, name}`);

    for (const brand of brands) {
        console.log(`\n⏳ Aggiornamento alt text logo: ${brand.name} [ID: ${brand._id}]`);
        // Deterministic alt text for brands
        const altText = `Logo ufficiale concessionario moto ${brand.name}`;

        await client.patch(brand._id).set({ 'logo.alt': altText }).commit();
        console.log(`✅ Alt text impostato: "${altText}"`);
    }
}

async function processMotorcycles() {
    console.log("\n==============================");
    console.log("Inizializzo SEO (standard) per le FOTO MOTO...");
    const bikes = await client.fetch(`*[_type == "motorcycle" && defined(images) && count(images) > 0]{
        _id, model, year, condition, type, cilindrata, 
        "brandName": brand->name,
        images
    }`);

    let updatedBikes = 0;

    for (const bike of bikes) {
        let hasChanges = false;

        const imagesToPatch = [...bike.images];

        for (let i = 0; i < imagesToPatch.length; i++) {
            const img = imagesToPatch[i];

            console.log(`\n⏳ Aggiornamento alt text moto: ${bike.brandName} ${bike.model} (${bike.year}) - Immagine ${i + 1}/${imagesToPatch.length} [ID: ${bike._id}]`);

            // Deterministic alt text for motorcycles
            const conditionStr = bike.condition === 'nuova' ? 'nuova' : 'usata';
            const typeStr = bike.type ? ` ${bike.type}` : '';
            const ccStr = bike.cilindrata ? ` ${bike.cilindrata}cc` : '';

            // Example: "Foto 1: Moto KTM 1290 Super Duke R usata 1301cc naked (2020)"
            // Example: "Foto 2: Moto Honda CBR600RR nuova 599cc sportiva (2024)"
            const altText = `Foto ${i + 1}: Moto ${bike.brandName} ${bike.model} ${conditionStr}${ccStr}${typeStr} (${bike.year})`;

            console.log(`✅ Alt text impostato: "${altText}"`);

            imagesToPatch[i] = { ...img, alt: altText };
            hasChanges = true;
        }

        if (hasChanges) {
            await client.patch(bike._id).set({ images: imagesToPatch }).commit();
            updatedBikes++;
        }
    }

    console.log(`\nProcessate ${updatedBikes} moto.`);
}

async function processHomepage() {
    console.log("\n==============================");
    console.log("Inizializzo SEO (standard) per HOMEPAGE...");

    // We update all of them to standard strings
    const homepageDocs = await client.fetch(`*[_type == "homepageContent"]{
        _id, 
        heroImage, heroTitle,
        featuredBlock1Image, featuredBlock1Title,
        featuredBlock2Image, featuredBlock2Title,
        featuredBlock3Image, featuredBlock3Title
    }`);

    for (const doc of homepageDocs) {
        const patches = {};

        if (doc.heroImage) {
            const heroTitle = doc.heroTitle || 'Concessionario moto nuove e usate';
            patches['heroImage.alt'] = `Immagine principale copertina: ${heroTitle}`;
            console.log(`✅ Hero alt text: "${patches['heroImage.alt']}"`);
        }

        for (let i = 1; i <= 3; i++) {
            const imgField = `featuredBlock${i}Image`;
            const titleField = `featuredBlock${i}Title`;

            if (doc[imgField]) {
                const titleStr = doc[titleField] || `Blocco in evidenza ${i}`;
                patches[`${imgField}.alt`] = `Foto in evidenza concessionario: ${titleStr}`;
                console.log(`✅ Blocco ${i} alt text: "${patches[`${imgField}.alt`]}"`);
            }
        }

        if (Object.keys(patches).length > 0) {
            await client.patch(doc._id).set(patches).commit();
            console.log(`💾 Salvataggio completato per HomepageContent [ID: ${doc._id}]`);
        }
    }
}

async function main() {
    console.log("🚀 AVVIO OTTIMIZZAZIONE SEO IMMAGINI CON STRINGHE STANDARD...");

    await processBrands();
    await processHomepage();
    await processMotorcycles();

    console.log("\n🎉 TUTTE LE IMMAGINI SONO STATE OTTIMIZZATE CON SUCCESSO PER LA SEO VIA STRINGHE STANDARD!");
}

main().catch(console.error);
