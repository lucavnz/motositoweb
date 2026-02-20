/**
 * Trova e cancella tutte le moto KTM "nuova" con anno < 2025.
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
    const brand = await sanityClient.fetch(`*[_type == "brand" && name == "KTM"][0]`)
    if (!brand) { console.log('❌ Brand KTM non trovato'); return }

    const query = `*[_type == "motorcycle" && references($brandId) && condition == "nuova" && year < 2025]{
        _id, model, year
    }`
    const bikes = await sanityClient.fetch(query, { brandId: brand._id })

    console.log(`\n🚫 Moto KTM nuove con anno < 2025: ${bikes.length}\n`)

    if (bikes.length === 0) {
        console.log('✅ Nessuna moto vecchia trovata!')
        return
    }

    for (const b of bikes) {
        console.log(`  - ${b.model} (${b.year}) [${b._id}]`)
    }

    console.log('\n🗑️  Eliminazione in corso...')
    for (const b of bikes) {
        await sanityClient.delete(b._id)
        console.log(`  ✅ Eliminata: ${b.model} (${b.year})`)
    }

    console.log(`\n✅ Eliminate ${bikes.length} moto con anno < 2025.`)
}

main().catch(console.error)
