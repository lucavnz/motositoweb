import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { client } from '@/lib/sanity.client'
import { urlFor } from '@/lib/sanity.image'
import {
    motorcycleBySlugQuery,
    allMotorcycleSlugsQuery,
    recommendedMotorcyclesQuery,
} from '@/lib/sanity.queries'
import { ImageGallery } from '@/components/ImageGallery'
import { PortableText } from '@portabletext/react'
import { MotorcycleCard } from '@/components/MotorcycleCard'

export const revalidate = 3600

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
    const motos = await client.fetch(allMotorcycleSlugsQuery)
    return (motos || []).map((m: { slug: { current: string } }) => ({
        slug: m.slug.current,
    }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const moto = await client.fetch(motorcycleBySlugQuery, { slug })
    if (!moto) return {}

    const imageUrl = moto.images?.[0]
        ? urlFor(moto.images[0]).width(1200).height(630).format('webp').url()
        : undefined

    const brandName = moto.brand?.name || 'Moto'

    const isUsed = moto.condition === 'usata'
    const conditionText = isUsed ? 'usata garantita' : 'nuova'

    const keywords = [
        `${brandName} ${moto.model} Brescia`,
        `concessionario ${brandName} Lombardia`,
        `prezzo ${brandName} ${moto.model}`,
        `vendita moto ${brandName}`,
        `${moto.model} usata Brescia`,
        `${moto.model} nuova Brescia`,
        'Avanzi Moto',
        'Bagnolo Mella'
    ]

    const priceString = moto.price ? ` - €${moto.price.toLocaleString('it-IT')}` : ' | Prezzo e Promozioni'
    const titleString = `${brandName} ${moto.model} ${moto.year || ''} a Brescia${priceString} | Avanzi Moto`.replace(/\s+/g, ' ').trim()
    const descString = moto.shortDescription
        ? `${moto.shortDescription} Scopri la ${brandName} ${moto.model} ${moto.year || ''} ${conditionText} da Avanzi Moto a Bagnolo Mella (Brescia).`
        : `Scopri la ${brandName} ${moto.model} ${moto.year || ''} ${conditionText} a Brescia. ${moto.price ? `Prezzo: €${moto.price.toLocaleString('it-IT')}. ` : ''}Il tuo concessionario ufficiale ${brandName} a Bagnolo Mella. Richiedi un preventivo o prenota un test ride.`

    return {
        title: titleString,
        description: descString,
        keywords,
        openGraph: {
            title: titleString,
            description: descString,
            images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
            type: 'website',
            locale: 'it_IT',
            siteName: 'Avanzi Moto',
        },
        alternates: {
            canonical: `https://avanzimoto.it/moto/${slug}`,
        },
    }
}

const typeLabels: Record<string, string> = {
    strada: 'Strada',
    enduro: 'Enduro',
    cross: 'Cross',
    scooter: 'Scooter',
}

export default async function MotorcycleDetailPage({ params }: PageProps) {
    const { slug } = await params

    // Fetch moto first, then recommendations with correct params
    const moto = await client.fetch(motorcycleBySlugQuery, { slug })

    if (!moto) notFound()

    const brandName = moto.brand?.name || ''

    // Now fetch recommendations with the actual type and brand
    const recommended = await client.fetch(recommendedMotorcyclesQuery, {
        currentSlug: slug,
        currentType: moto.type || 'strada',
        brandSlug: moto.brand?.slug?.current || '',
    })
    const backUrl =
        moto.condition === 'usata'
            ? '/usato'
            : moto.brand?.slug?.current
                ? `/marchi/${moto.brand.slug.current}`
                : '/'

    const backLabel =
        moto.condition === 'usata'
            ? 'Moto Usate'
            : brandName
                ? `Moto ${brandName}`
                : 'Home'

    // Product JSON-LD
    const productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${brandName} ${moto.model} ${moto.year}`,
        brand: {
            '@type': 'Brand',
            name: brandName,
        },
        description: moto.shortDescription || '',
        category: typeLabels[moto.type] || moto.type,
        ...(moto.price && {
            offers: {
                '@type': 'Offer',
                price: moto.price,
                priceCurrency: 'EUR',
                availability: 'https://schema.org/InStock',
                seller: {
                    '@type': 'MotorcycleDealer',
                    name: 'Avanzi Moto',
                    url: 'https://avanzimoto.it',
                    address: {
                        "@type": "PostalAddress",
                        "streetAddress": "Viale Europa, 3/A",
                        "addressLocality": "Bagnolo Mella",
                        "postalCode": "25021",
                        "addressRegion": "BS",
                        "addressCountry": "IT"
                    }
                },
            },
        }),
        ...(moto.images?.[0] && {
            image: urlFor(moto.images[0]).width(1200).height(800).format('webp').url(),
        }),
    }

    // Breadcrumb JSON-LD
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://avanzimoto.it',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: backLabel,
                item: `https://avanzimoto.it${backUrl}`,
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: `${brandName} ${moto.model}`,
            },
        ],
    }

    // Split recommended into sections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameType = recommended?.filter((m: any) => m.type === moto.type).slice(0, 4) || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameTypeIds = new Set(sameType.map((m: any) => m._id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameBrand = recommended?.filter((m: any) => !sameTypeIds.has(m._id) && m.brand?.slug?.current === moto.brand?.slug?.current).slice(0, 4) || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameBrandIds = new Set(sameBrand.map((m: any) => m._id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const otherRecommended = recommended?.filter((m: any) => !sameTypeIds.has(m._id) && !sameBrandIds.has(m._id)).slice(0, 4) || []

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            <div className="detail-v2">
                {/* Breadcrumb */}
                <nav className="detail-v2-breadcrumb" aria-label="Breadcrumb">
                    <Link href="/">Home</Link>
                    <span className="detail-v2-breadcrumb-sep">/</span>
                    <Link href={backUrl}>{backLabel}</Link>
                    <span className="detail-v2-breadcrumb-sep">/</span>
                    <span className="detail-v2-breadcrumb-current">{moto.model}</span>
                </nav>

                {/* Gallery */}
                {moto.images && moto.images.length > 0 && (
                    <ImageGallery images={moto.images} />
                )}

                {/* Two-column content */}
                <div className="detail-v2-grid">
                    {/* Left column: info */}
                    <div className="detail-v2-info">
                        <div className="detail-v2-brand-tag">{brandName} {moto.year}</div>
                        <h1 className="detail-v2-model">
                            {moto.model}
                            <span className="sr-only"> a Brescia - Concessionario {brandName}</span>
                        </h1>

                        {moto.price && (
                            <div className="detail-v2-price">
                                <span className="detail-v2-price-currency">€</span>
                                {moto.price.toLocaleString('it-IT')}
                            </div>
                        )}

                        {/* Description */}
                        {(moto.shortDescription || moto.longDescription) && (
                            <div className="detail-v2-description">
                                <h2>DESCRIZIONE DELLA MOTO</h2>
                                {moto.shortDescription && <p className="detail-v2-short-desc">{moto.shortDescription}</p>}
                                {moto.longDescription && (
                                    <div className="detail-v2-long-desc">
                                        <PortableText value={moto.longDescription} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right column: specs + CTA */}
                    <aside className="detail-v2-sidebar">
                        <div className="detail-v2-specs-card">
                            <div className="detail-v2-specs-list">
                                <div className="detail-v2-spec-row">
                                    <span className="detail-v2-spec-label">Anno</span>
                                    <span className="detail-v2-spec-value">{moto.year}</span>
                                </div>
                                <div className="detail-v2-spec-row">
                                    <span className="detail-v2-spec-label">Tipo</span>
                                    <span className="detail-v2-spec-value">{typeLabels[moto.type] || moto.type}</span>
                                </div>
                                {moto.cilindrata && (
                                    <div className="detail-v2-spec-row">
                                        <span className="detail-v2-spec-label">Cilindrata</span>
                                        <span className="detail-v2-spec-value">{moto.cilindrata} cc</span>
                                    </div>
                                )}
                                <div className="detail-v2-spec-row">
                                    <span className="detail-v2-spec-label">Condizione</span>
                                    <span className="detail-v2-spec-value">{moto.condition === 'nuova' ? 'Nuova' : 'Usata'}</span>
                                </div>
                                {moto.condition === 'usata' && moto.kilometers && (
                                    <div className="detail-v2-spec-row">
                                        <span className="detail-v2-spec-label">Chilometri</span>
                                        <span className="detail-v2-spec-value">{moto.kilometers.toLocaleString('it-IT')} km</span>
                                    </div>
                                )}
                                {moto.brand && (
                                    <div className="detail-v2-spec-row">
                                        <span className="detail-v2-spec-label">Brand</span>
                                        <span className="detail-v2-spec-value">{brandName}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="detail-v2-cta-card">
                            <h3 className="detail-v2-cta-title">Interessato?</h3>
                            <p className="detail-v2-cta-desc">
                                Contattaci per maggiori informazioni o per prenotare una prova su strada.
                            </p>
                            <a href="tel:030620452" className="detail-v2-cta-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                030 620452
                            </a>
                            <a href="https://wa.me/393473809996" target="_blank" rel="noopener noreferrer" className="detail-v2-cta-btn detail-v2-cta-btn--whatsapp">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                347 3809996
                            </a>
                            <a href="mailto:info@avanzimoto.it" className="detail-v2-cta-btn detail-v2-cta-btn--outline">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                info@avanzimoto.it
                            </a>
                        </div>
                    </aside>
                </div>
            </div>

            {/* --- Recommended Sections --- */}
            <div className="recommended-sections" style={{ marginTop: '2rem' }}>
                {sameType.length > 0 && (
                    <section className="latest-section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                        <div className="featured-blocks-header">
                            <span className="featured-blocks-tag">CONSIGLIATE</span>
                            <h2 className="featured-blocks-title">
                                CATEGORIA <span>SIMILE</span>
                            </h2>
                            <p className="featured-blocks-subtitle">
                                Moto della stessa categoria che potrebbero interessarti.
                            </p>
                        </div>
                        <div className="moto-grid">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {sameType.map((m: any) => <MotorcycleCard key={m._id} motorcycle={m} />)}
                        </div>
                    </section>
                )}

                {sameBrand.length > 0 && (
                    <section className="latest-section" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
                        <div className="featured-blocks-header">
                            <span className="featured-blocks-tag">CONSIGLIATE</span>
                            <h2 className="featured-blocks-title">
                                ALTRE MOTO <span>{brandName.toUpperCase()}</span>
                            </h2>
                            <p className="featured-blocks-subtitle">
                                Scopri tutta la gamma {brandName}.
                            </p>
                        </div>
                        <div className="moto-grid">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {sameBrand.map((m: any) => <MotorcycleCard key={m._id} motorcycle={m} />)}
                        </div>
                    </section>
                )}

                {otherRecommended.length > 0 && (
                    <section className="latest-section" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
                        <div className="featured-blocks-header">
                            <span className="featured-blocks-tag">CONSIGLIATE</span>
                            <h2 className="featured-blocks-title">
                                POTREBBE <span>INTERESSARTI</span>
                            </h2>
                            <p className="featured-blocks-subtitle">
                                Altre moto che potrebbero piacerti.
                            </p>
                        </div>
                        <div className="moto-grid">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {otherRecommended.map((m: any) => <MotorcycleCard key={m._id} motorcycle={m} />)}
                        </div>
                    </section>
                )}
            </div>

            {/* ── MOTO SEO CONTENT BLOCK ── */}
            <section className="seo-content-block">
                <div className="seo-content-inner">
                    <h2>Scopri {brandName} {moto.model} a Brescia</h2>
                    <p>
                        Vieni a scoprire <strong>{brandName} {moto.model}</strong> nel nostro showroom a <strong>Bagnolo Mella (Brescia)</strong>. Che tu stia cercando una compagna per le tue avventure fuoristrada, una soluzione agile per i tuoi spostamenti urbani o la moto perfetta per i lunghi viaggi, affidati a noi. Come <strong>concessionario ufficiale {brandName}</strong> e centro specializzato in Lombardia, <strong>Avanzi Moto</strong> ti offre le migliori condizioni d'acquisto e servizi post-vendita.
                    </p>
                    <p>
                        Il nostro team di esperti è a tua disposizione per illustrarti i dettagli tecnici e le prestazioni straordinarie della <strong>{moto.model}</strong>. Approfitta delle nostre promozioni esclusive, richiedi una <strong>valutazione senza impegno del tuo usato in permuta</strong> e sfrutta l'esperienza della nostra officina meccanica autorizzata. Prenota oggi stesso il tuo test ride e inizia a vivere l'emozione di guidare una vera {brandName}!
                    </p>
                </div>
            </section>
        </>
    )
}
