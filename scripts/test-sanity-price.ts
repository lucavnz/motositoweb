import { createClient } from '@sanity/client'
import { groq } from 'next-sanity'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2023-01-01',
    useCdn: false,
})

async function main() {
    const query = groq`*[_type == "motorcycle"] { _id, price }`
    const motos = await client.fetch(query)

    const total = motos.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withPrice = motos.filter((m: any) => m.price != null && m.price > 0).length
    const withoutPrice = total - withPrice

    console.log(`Total motos: ${total}`)
    console.log(`Motos with price: ${withPrice}`)
    console.log(`Motos without price: ${withoutPrice}`)
}

main().catch(console.error)
