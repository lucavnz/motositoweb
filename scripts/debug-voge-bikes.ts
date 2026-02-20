import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
})

async function main() {
    const brand = await client.fetch(`*[_type == "brand" && name match "VOGE"][0]`)
    if (!brand) return console.log("NO VOGE BRAND")

    console.log("VOGE _id: " + brand._id)

    const bikes = await client.fetch(`*[_type == "motorcycle" && references("${brand._id}")] | order(model asc){
        model, price, cilindrata, "imagesCount": count(images[])
    }`)

    console.log(`\nFound ${bikes.length} Voge motorcycles:\n`)
    console.table(bikes)
}

main().catch(console.error)
