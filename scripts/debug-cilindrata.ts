import { createClient } from '@sanity/client'

const client = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
})

async function main() {
    const motos = await client.fetch(`*[_type == "motorcycle" && condition == "usata"]{ model, cilindrata }`)
    console.log(`Total used motorcycles: ${motos.length}`)
    const withCilindrata = motos.filter((m: any) => m.cilindrata)
    console.log(`With cilindrata: ${withCilindrata.length}`)
    console.log(withCilindrata.slice(0, 5))
}
main().catch(console.error)
