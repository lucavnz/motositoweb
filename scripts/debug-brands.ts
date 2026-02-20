import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
})

async function main() {
    const brands = await client.fetch(`*[_type == "brand"]{_id, name, slug}`)
    console.log('Brands found:', brands)
}

main()
