/**
 * Elimina TUTTE le moto KTM "nuova" da Sanity per un resync completo.
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

    const query = `*[_type == "motorcycle" && references($brandId) && condition == "nuova"]{ _id, model, year }`
    const bikes = await sanityClient.fetch(query, { brandId: brand._id })

    console.log(`\n🗑️  Moto KTM nuove totali da eliminare: ${bikes.length}\n`)
    if (bikes.length === 0) { console.log('✅ Nessuna moto da eliminare!'); return }

    for (const b of bikes) console.log(`  - ${b.model} (${b.year})`)

    console.log('\n🗑️  Eliminazione in corso...')
    let deleted = 0
    for (const b of bikes) {
        await sanityClient.delete(b._id)
        deleted++
        if (deleted % 10 === 0) console.log(`  ... ${deleted}/${bikes.length}`)
    }
    console.log(`\n✅ Eliminate ${deleted} moto KTM.`)
}

main().catch(console.error)
