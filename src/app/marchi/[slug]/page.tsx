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
        title: `Moto ${brand.name} Nuove a Brescia | Concessionario Ufficiale Avanzi Moto`,
        description: `Avanzi Moto è il tuo concessionario ufficiale ${brand.name} a Bagnolo Mella (Brescia). Scopri il catalogo completo di moto ${brand.name} nuove. Preventivi, assistenza e prova su strada.`,
        keywords: [`concessionario ${brand.name} Brescia`, `moto ${brand.name} nuove Brescia`, `vendita ${brand.name} Lombardia`, `${brand.name} Bagnolo Mella`, `officina autorizzata ${brand.name}`, `Avanzi Moto`],
        openGraph: {
            title: `Moto ${brand.name} Nuove a Brescia | Avanzi Moto`,
            description: `Catalogo completo moto ${brand.name} nuove. Il tuo concessionario di fiducia a Brescia.`,
            type: 'website',
            locale: 'it_IT',
            siteName: 'Avanzi Moto',
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
            {/* ── SEO JSON-LD per il Brand ── */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Store",
                        "name": `Concessionario Ufficiale ${brand.name} Brescia - Avanzi Moto`,
                        "description": `Vendita e assistenza ufficiale moto ${brand.name} nuove a Brescia.`,
                        "url": `https://avanzimoto.it/marchi/${slug}`,
                        "telephone": "+39 030 620134",
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": "Viale Europa, 3/A",
                            "addressLocality": "Bagnolo Mella",
                            "postalCode": "25021",
                            "addressRegion": "BS",
                            "addressCountry": "IT"
                        },
                        "department": {
                            "@type": "MotorcycleDealer",
                            "name": `Showroom ${brand.name}`
                        }
                    })
                }}
            />

            <div className="brand-header">
                <span className="brand-header-label">CATALOGO MOTO {brand.name}</span>
                <h1>
                    Moto Nuove {brand.name}
                    <span className="sr-only"> - Concessionario Ufficiale a Brescia</span>
                </h1>
                <p>
                    Scopri la gamma completa di moto {brand.name} nuove disponibili presso
                    Avanzi Moto, concessionario ufficiale a Bagnolo Mella, BRESCIA.
                </p>
            </div>
            <section className="section">
                <BrandCatalogClient motorcycles={motorcycles || []} />
            </section>

            {/* ── SEO CONTENT BLOCK ── */}
            <section className="seo-content-block">
                <div className="seo-content-inner">
                    <h2>Concessionario Ufficiale {brand.name} a Brescia</h2>
                    <p>
                        Stai cercando una moto <strong>{brand.name}</strong> a <strong>Brescia</strong> o in tutta la Lombardia? Dal 1950, <strong>Avanzi Moto</strong> è il <strong>concessionario ufficiale {brand.name}</strong> di riferimento a <strong>Bagnolo Mella</strong>. Scopri in sede l'intero catalogo di modelli nuovi, prenota un test ride e affidati alla nostra officina autorizzata con ricambi originali e accessori dedicati.
                    </p>
                    <p>
                        Il nostro team di esperti vanta un'esperienza decennale sui motori <strong>{brand.name}</strong>, garantendoti l'assistenza migliore d'Italia, sia per l'acquisto della tua prossima moto, sia per la manutenzione e la cura del tuo veicolo. Vienici a trovare nel nostro showroom per scoprire promozioni esclusive, finanziamenti personalizzati e tutte le novità in pronta consegna.
                    </p>
                </div>
            </section>
        </>
    )
}
