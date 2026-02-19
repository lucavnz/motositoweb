import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: 'skANNlQ3ccntXq277S4WLz5UcblnyaTuuYztEJ2w4YC0OX2j0cPKRQevqbPtQx9OxPAJcIdwYSaBxOT5UPOuNYlp01ThqeypiWhvkKviOoBazHTf4kYjCxRGRVh3ojzgC7L3V4IgHLExflXRlql5K8rgY7dbe0eaN7EBalyI4T4aQLEX29x4',
    useCdn: false,
})

async function main() {
    const brands = await client.fetch(`*[_type == "brand"]{_id, name, slug}`)
    console.log('Brands found:', brands)
}

main()
