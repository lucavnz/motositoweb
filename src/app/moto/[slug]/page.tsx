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

    return {
        title: `${moto.model} ${moto.year} — ${moto.brand?.name || ''}`,
        description:
            moto.shortDescription ||
            `${moto.model} ${moto.year} ${moto.brand?.name || ''} disponibile presso Avanzi Moto.`,
        openGraph: {
            title: `${moto.model} ${moto.year} — ${moto.brand?.name || ''} | Avanzi Moto`,
            description:
                moto.shortDescription ||
                `Scopri ${moto.model} ${moto.brand?.name || ''} presso Avanzi Moto.`,
            images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
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

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${moto.model} ${moto.year}`,
        brand: {
            '@type': 'Brand',
            name: moto.brand?.name || '',
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

    const backUrl =
        moto.condition === 'usata'
            ? '/usato'
            : moto.brand?.slug?.current
                ? `/marchi/${moto.brand.slug.current}`
                : '/'

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="detail-page">
                {/* Gallery */}
                {moto.images && moto.images.length > 0 && (
                    <ImageGallery images={moto.images} />
                )}

                <div className="detail-content">
                    <Link href={backUrl} className="back-link">
                        ← Torna al catalogo
                    </Link>

                    <div className="detail-header">
                        <div className="detail-brand-name">
                            {moto.brand?.name || ''}
                        </div>
                        <h1 className="detail-model">{moto.model}</h1>
                        {moto.price && (
                            <div className="detail-price-tag">
                                <span className="currency">€</span>
                                {moto.price.toLocaleString('it-IT')}
                            </div>
                        )}
                    </div>

                    {/* Specs */}
                    <div className="detail-specs">
                        <div className="detail-spec">
                            <div className="detail-spec-label">Anno</div>
                            <div className="detail-spec-value">{moto.year}</div>
                        </div>
                        <div className="detail-spec">
                            <div className="detail-spec-label">Tipo</div>
                            <div className="detail-spec-value">
                                {typeLabels[moto.type] || moto.type}
                            </div>
                        </div>
                        <div className="detail-spec">
                            <div className="detail-spec-label">Condizione</div>
                            <div className="detail-spec-value">
                                {moto.condition === 'nuova' ? 'Nuova' : 'Usata'}
                            </div>
                        </div>
                        {moto.condition === 'usata' && moto.kilometers && (
                            <div className="detail-spec">
                                <div className="detail-spec-label">Chilometri</div>
                                <div className="detail-spec-value">
                                    {moto.kilometers.toLocaleString('it-IT')} km
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {(moto.shortDescription || moto.longDescription) && (
                        <div className="detail-description">
                            <h3>DESCRIZIONE</h3>
                            {moto.shortDescription && <p>{moto.shortDescription}</p>}
                            {moto.longDescription && (
                                <PortableText value={moto.longDescription} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
