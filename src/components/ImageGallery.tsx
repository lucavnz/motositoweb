'use client'

import { useState } from 'react'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity.image'

interface GalleryImage {
    asset: { _ref?: string; _id?: string; url?: string }
    alt?: string
}

export function ImageGallery({ images }: { images: GalleryImage[] }) {
    const [activeIndex, setActiveIndex] = useState(0)

    if (!images || images.length === 0) {
        return (
            <div className="gallery">
                <div className="gallery-main skeleton" />
            </div>
        )
    }

    const mainImage = images[activeIndex]
    const mainUrl = urlFor(mainImage)
        .width(1200)
        .height(750)
        .format('webp')
        .quality(85)
        .url()

    return (
        <div className="gallery">
            <div className="gallery-main">
                <Image
                    src={mainUrl}
                    alt={mainImage.alt || 'Moto'}
                    fill
                    sizes="100vw"
                    style={{ objectFit: 'cover' }}
                    priority
                />
            </div>
            {images.length > 1 && (
                <div className="gallery-thumbs">
                    {images.map((img, idx) => {
                        const thumbUrl = urlFor(img)
                            .width(400)
                            .height(300)
                            .format('webp')
                            .quality(70)
                            .url()
                        return (
                            <div
                                key={idx}
                                className={`gallery-thumb ${idx === activeIndex ? 'active' : ''}`}
                                onClick={() => setActiveIndex(idx)}
                            >
                                <Image
                                    src={thumbUrl}
                                    alt={img.alt || `Immagine ${idx + 1}`}
                                    fill
                                    sizes="25vw"
                                    style={{ objectFit: 'cover' }}
                                    loading="lazy"
                                />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
