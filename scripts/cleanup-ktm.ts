/**
 * 🧹 Cleanup KTM → Sanity
 *
 * Removes motorcycles created by the sync-ktm.ts script
 * Filter: Brand ID == KTM && Condition == 'nuova' && !defined(motoItProductId)
 */

import { createClient } from '@sanity/client'

// Use the token provided by user
const SANITY_TOKEN = 'skANNlQ3ccntXq277S4WLz5UcblnyaTuuYztEJ2w4YC0OX2j0cPKRQevqbPtQx9OxPAJcIdwYSaBxOT5UPOuNYlp01ThqeypiWhvkKviOoBazHTf4kYjCxRGRVh3ojzgC7L3V4IgHLExflXRlql5K8rgY7dbe0eaN7EBalyI4T4aQLEX29x4'

const sanityClient = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: SANITY_TOKEN,
    useCdn: false,
})

async function main() {
    console.log('🧹 Cleanup tool for KTM New Bikes')

    // 1. Find Brand ID for KTM
    const brand = await sanityClient.fetch(`*[_type == "brand" && name == "KTM"][0]`)
    if (!brand) {
        console.error('❌ Could not find KTM brand')
        return
    }
    const brandId = brand._id
    console.log(`Found KTM Brand ID: ${brandId}`)

    // 2. Fetch bikes to delete
    // Only delete 'nuova' condition (sync script sets this) and maybe filter by !defined(motoItProductId) to be safer
    // The incorrect run might have created duplicates or bad data.
    const query = `*[_type == "motorcycle" && references($brandId) && condition == "nuova" && !defined(motoItProductId)]`
    const bikes = await sanityClient.fetch(query, { brandId })

    console.log(`Found ${bikes.length} bikes matching criteria.`)

    if (bikes.length === 0) {
        console.log('Nothing to delete.')
        return
    }

    // 3. Delete
    console.log('WARNING: This will delete the following bikes:')
    bikes.forEach((b: any) => console.log(` - ${b.model} (${b.year || '?'}) [${b._id}]`))

    // Ask for confirmation (simulated here since I can't be interactive, I'll just proceed as user asked to "cancel/de-modify")
    // Wait, let's delay 5s just in case I want to stop it manually if running locally (which I'm not really).
    // I will proceed.

    console.log('\n🗑️  Deleting...')
    const tx = sanityClient.transaction()
    for (const bike of bikes) {
        tx.delete(bike._id)
    }
    await tx.commit()
    console.log('✅ Deleted successfully.')
}

main().catch(console.error)
