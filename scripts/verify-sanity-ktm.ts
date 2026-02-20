import { createClient } from '@sanity/client'

const SANITY_TOKEN = process.env.SANITY_API_TOKEN as string;

const sanityClient = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: SANITY_TOKEN,
    useCdn: false,
})

async function main() {
    console.log('🔍 Checking 450 SX-F KTM bike...')
    const query = `*[_type == "motorcycle" && condition == "nuova" && model match "450 SX-F*"] | order(_createdAt desc)[0]`
    const bike = await sanityClient.fetch(query)

    if (!bike) {
        console.log('No new bikes found yet.')
        return
    }

    console.log(`\nModel: ${bike.model} (${bike.year})`)
    console.log(`Type: ${bike.type}`)
    console.log(`Price: ${bike.price}`)
    console.log(`Description: ${bike.shortDescription?.substring(0, 50)}...`)

    // Check images (if uploaded, we only see asset ref, but we can check count)
    console.log(`Images: ${bike.images?.length || 0}`)
}

main()
