/**
 * Trova e cancella tutte le moto KTM "nuova" che non hanno immagini in Sanity.
 */

import { createClient } from '@sanity/client'

const sanityClient = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
})

async function main() {
    // Find KTM brand
    const brand = await sanityClient.fetch(`*[_type == "brand" && name == "KTM"][0]`)
    if (!brand) { console.log('❌ Brand KTM non trovato'); return }

    // Fetch all KTM nuova bikes
    const query = `*[_type == "motorcycle" && references($brandId) && condition == "nuova"]{
        _id, model, year,
        "imageCount": count(images)
    }`
    const bikes = await sanityClient.fetch(query, { brandId: brand._id })

    // Filter those with no images
    const noImages = bikes.filter((b: any) => !b.imageCount || b.imageCount === 0)

    console.log(`\n📊 Totale moto KTM nuove: ${bikes.length}`)
    console.log(`🚫 Senza immagini: ${noImages.length}\n`)

    if (noImages.length === 0) {
        console.log('✅ Tutte le moto hanno almeno un\'immagine!')
        return
    }

    console.log('Moto da eliminare:')
    for (const b of noImages) {
        console.log(`  - ${b.model} (${b.year}) [${b._id}]`)
    }

    // Delete them
    console.log('\n🗑️  Eliminazione in corso...')
    for (const b of noImages) {
        await sanityClient.delete(b._id)
        console.log(`  ✅ Eliminata: ${b.model} (${b.year})`)
    }

    console.log(`\n✅ Eliminate ${noImages.length} moto senza immagini.`)
}

main().catch(console.error)
