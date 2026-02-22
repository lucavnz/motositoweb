/**
 * Cleanup all KYMCO data from Sanity
 */
import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN as string,
    useCdn: false,
})

async function main() {
    const brand = await client.fetch(`*[_type == "brand" && name match "KYMCO"][0]`)
    if (!brand) {
        console.log('No KYMCO brand found.')
        return
    }
    console.log(`KYMCO _id: ${brand._id}`)

    const bikes = await client.fetch(
        `*[_type == "motorcycle" && brand._ref == $id]._id`,
        { id: brand._id }
    )
    console.log(`Deleting ${bikes.length} KYMCO motorcycles...`)

    for (const id of bikes) {
        await client.delete(id)
    }
    console.log('✅ Deleted all KYMCO bikes!')
}

main().catch(console.error)
