import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: 'skANNlQ3ccntXq277S4WLz5UcblnyaTuuYztEJ2w4YC0OX2j0cPKRQevqbPtQx9OxPAJcIdwYSaBxOT5UPOuNYlp01ThqeypiWhvkKviOoBazHTf4kYjCxRGRVh3ojzgC7L3V4IgHLExflXRlql5K8rgY7dbe0eaN7EBalyI4T4aQLEX29x4',
    useCdn: false,
})

async function main() {
    const brand = await client.fetch(`*[_type == "brand" && name match "VOGE"][0]`)
    if (!brand) return console.log("NO VOGE BRAND")

    console.log("VOGE _id: " + brand._id)

    const bikes = await client.fetch(`*[_type == "motorcycle" && references("${brand._id}")]`)

    console.log(`Deleting ${bikes.length} Voge motorcycles...`)
    const transaction = client.transaction()
    for (const bike of bikes) {
        transaction.delete(bike._id)
    }
    await transaction.commit()
    console.log('✅ Deleted all Voge bikes!')
}

main().catch(console.error)
