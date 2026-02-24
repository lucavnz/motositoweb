import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity.image'

interface MotorcycleCardProps {
    motorcycle: {
        _id: string
        model: string
        slug: { current: string }
        year: number
        type: string
        condition: string
        price?: number
        kilometers?: number
        shortDescription?: string
        images?: Array<{
            asset: { _ref?: string; _id?: string; url?: string }
            alt?: string
        }>
        brand?: {
            name: string
            slug: { current: string }
        }
    }
}

const typeLabels: Record<string, string> = {
    strada: 'Strada',
    enduro: 'Enduro',
    cross: 'Cross',
    scooter: 'Scooter',
}

export function MotorcycleCard({ motorcycle }: MotorcycleCardProps) {
    const firstImage = motorcycle.images?.[0]
    const imageUrl = firstImage
        ? urlFor(firstImage).width(640).height(480).format('webp').quality(75).url()
        : null

    return (
        <Link href={`/moto/${motorcycle.slug.current}`} className="moto-card">
            <div className="moto-card-image">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={firstImage?.alt || motorcycle.model}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                        unoptimized
                    />
                ) : (
                    <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                )}

            </div>
            <div className="moto-card-info">
                {motorcycle.brand && (
                    <div className="moto-card-brand">
                        {motorcycle.brand.name} {motorcycle.year}
                        {motorcycle.condition === 'usata' && motorcycle.kilometers && (
                            <> · {motorcycle.kilometers.toLocaleString('it-IT')} km</>
                        )}
                    </div>
                )}
                <div className="moto-card-model">{motorcycle.model}</div>
                {motorcycle.price && (
                    <div className="moto-card-price">
                        <span className="currency">€</span>{' '}
                        {motorcycle.price.toLocaleString('it-IT')}
                    </div>
                )}
            </div>
        </Link>
    )
}
