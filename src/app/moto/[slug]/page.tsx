import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { client } from '@/lib/sanity.client'
import { urlFor } from '@/lib/sanity.image'
import {
    motorcycleBySlugQuery,
    allMotorcycleSlugsQuery,
} from '@/lib/sanity.queries'
import { ImageGallery } from '@/components/ImageGallery'
import { PortableText } from '@portabletext/react'

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

    return {
        title: `${brandName} ${moto.model} ${moto.year} — Avanzi Moto`,
        description:
            moto.shortDescription ||
            `${brandName} ${moto.model} ${moto.year} disponibile presso Avanzi Moto, concessionario a Bagnolo Mella (BS).`,
        openGraph: {
            title: `${brandName} ${moto.model} ${moto.year} | Avanzi Moto`,
            description:
                moto.shortDescription ||
                `Scopri ${brandName} ${moto.model} presso Avanzi Moto, concessionario ufficiale.`,
            images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
            type: 'website',
        },
        alternates: {
            canonical: `/moto/${slug}`,
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
    const moto = await client.fetch(motorcycleBySlugQuery, { slug })

    if (!moto) notFound()

    const brandName = moto.brand?.name || ''
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
                    '@type': 'Organization',
                    name: 'Avanzi Moto',
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
                        <h1 className="detail-v2-model">{moto.model}</h1>

                        {moto.price && (
                            <div className="detail-v2-price">
                                <span className="detail-v2-price-currency">€</span>
                                {moto.price.toLocaleString('it-IT')}
                            </div>
                        )}

                        {/* Description */}
                        {(moto.shortDescription || moto.longDescription) && (
                            <div className="detail-v2-description">
                                <h2>Descrizione</h2>
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
                            <h3 className="detail-v2-specs-title">SPECIFICHE</h3>
                            <div className="detail-v2-specs-list">
                                <div className="detail-v2-spec-row">
                                    <span className="detail-v2-spec-label">Anno</span>
                                    <span className="detail-v2-spec-value">{moto.year}</span>
                                </div>
                                <div className="detail-v2-spec-row">
                                    <span className="detail-v2-spec-label">Tipo</span>
                                    <span className="detail-v2-spec-value">{typeLabels[moto.type] || moto.type}</span>
                                </div>
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
                            <a href="tel:+390309770205" className="detail-v2-cta-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                Chiamaci
                            </a>
                            <a href="mailto:info@avanzimoto.it" className="detail-v2-cta-btn detail-v2-cta-btn--outline">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                Scrivici
                            </a>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    )
}
