import type { MetadataRoute } from 'next'
import { client } from '@/lib/sanity.client'
import { allBrandSlugsQuery, allMotorcycleSlugsQuery } from '@/lib/sanity.queries'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avanzimoto.it'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [brands, motorcycles] = await Promise.all([
        client.fetch(allBrandSlugsQuery),
        client.fetch(allMotorcycleSlugsQuery),
    ])

    const brandEntries = (brands || []).map(
        (b: { slug: { current: string } }) => ({
            url: `${BASE_URL}/marchi/${b.slug.current}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        })
    )

    const motoEntries = (motorcycles || []).map(
        (m: { slug: { current: string } }) => ({
            url: `${BASE_URL}/moto/${m.slug.current}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        })
    )

    return [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${BASE_URL}/usato`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...brandEntries,
        ...motoEntries,
    ]
}
