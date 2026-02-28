const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
});

async function main() {
    console.log("Resettando il flag isAiGeneratedDescription per tutte le moto usate...");

    // Fetch all used motorcycles
    const bikes = await client.fetch(`*[_type == "motorcycle" && condition == "usata" && isAiGeneratedDescription == true] { _id, model }`);

    console.log(`Trovate ${bikes.length} moto usate da resettare.`);

    for (const bike of bikes) {
        console.log(`Resetto flag per: ${bike.model} (${bike._id})`);
        await client.patch(bike._id).set({ isAiGeneratedDescription: false }).commit();
    }

    console.log("Completato il reset del flag.");
}

main().catch(console.error);
