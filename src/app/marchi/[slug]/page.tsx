import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/lib/sanity.client'
import {
    brandBySlugQuery,
    newMotorcyclesByBrandQuery,
    allBrandSlugsQuery,
} from '@/lib/sanity.queries'
import { BrandCatalogClient } from '@/components/BrandCatalogClient'

export const revalidate = 3600

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
    const brands = await client.fetch(allBrandSlugsQuery)
    return (brands || []).map((b: { slug: { current: string } }) => ({
        slug: b.slug.current,
    }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const brand = await client.fetch(brandBySlugQuery, { slug })
    if (!brand) return {}

    return {
        title: `Moto ${brand.name} Nuove — Catalogo ${brand.name}`,
        description: `Scopri tutte le moto ${brand.name} nuove disponibili presso Avanzi Moto. Modelli strada, enduro, cross e scooter.`,
        openGraph: {
            title: `Moto ${brand.name} Nuove — Avanzi Moto`,
            description: `Catalogo completo moto ${brand.name} nuove. Concessionario Avanzi Moto.`,
        },
    }
}

export default async function BrandPage({ params }: PageProps) {
    const { slug } = await params
    const [brand, motorcycles] = await Promise.all([
        client.fetch(brandBySlugQuery, { slug }),
        client.fetch(newMotorcyclesByBrandQuery, { brandSlug: slug }),
    ])

    if (!brand) notFound()

    return (
        <>
            <div className="page-header">
                <h1>
                    <span>{brand.name}</span> — Moto Nuove
                </h1>
                <p>
                    Scopri la gamma completa di moto {brand.name} nuove disponibili presso
                    Avanzi Moto.
                </p>
            </div>
            <section className="section">
                <BrandCatalogClient motorcycles={motorcycles || []} />
            </section>
        </>
    )
}
