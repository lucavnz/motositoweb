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
        (b: { slug: { current: string }; _updatedAt?: string }) => ({
            url: `${BASE_URL}/marchi/${b.slug.current}`,
            lastModified: b._updatedAt ? new Date(b._updatedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        })
    )

    const motoEntries = (motorcycles || []).map(
        (m: { slug: { current: string }; _updatedAt?: string }) => ({
            url: `${BASE_URL}/moto/${m.slug.current}`,
            lastModified: m._updatedAt ? new Date(m._updatedAt) : new Date(),
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
        {
            url: `${BASE_URL}/contattaci`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        ...brandEntries,
        ...motoEntries,
    ]
}
