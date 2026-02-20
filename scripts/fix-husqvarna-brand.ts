import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
})

async function main() {
    console.log('Fetching brands...')
    const brands = await client.fetch<any[]>(`*[_type == "brand"]{_id, name}`)

    // Find the original HUSQVARNA (uppercase) and the new Husqvarna (Title Case)
    const originalBrand = brands.find(b => b.name === 'HUSQVARNA')
    const newBrand = brands.find(b => b.name === 'Husqvarna')

    if (!originalBrand || !newBrand) {
        console.log('Could not find both brands. Found:', brands.filter(b => b.name.toLowerCase() === 'husqvarna'))
        return
    }

    console.log(`Original Brand ID: ${originalBrand._id}`)
    console.log(`New Brand (Duplicate) ID: ${newBrand._id}`)

    // Find all motorcycles linked to the duplicate brand
    const bikesToUpdate = await client.fetch<any[]>(
        `*[_type == "motorcycle" && references($duplicateId)]`,
        { duplicateId: newBrand._id }
    )

    console.log(`Found ${bikesToUpdate.length} motorcycles linked to the duplicate brand.`)

    // Start a transaction to update bikes and delete the duplicate
    const transaction = client.transaction()

    bikesToUpdate.forEach(bike => {
        transaction.patch(bike._id, p => p.set({ brand: { _type: 'reference', _ref: originalBrand._id } }))
    })

    // Delete the duplicate brand
    transaction.delete(newBrand._id)

    console.log('Committing transaction...')
    const result = await transaction.commit()
    console.log('Transaction result:', result)
    console.log('✅ Successfully merged brands!')
}

main().catch(console.error)
