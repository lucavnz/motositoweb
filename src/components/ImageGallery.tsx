'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity.image'

interface GalleryImage {
    asset: { _ref?: string; _id?: string; url?: string }
    alt?: string
}

export function ImageGallery({ images }: { images: GalleryImage[] }) {
    const [activeIndex, setActiveIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)

    const goTo = useCallback(
        (idx: number) => {
            if (idx === activeIndex || isTransitioning) return
            setIsTransitioning(true)
            setTimeout(() => {
                setActiveIndex(idx)
                setTimeout(() => setIsTransitioning(false), 60)
            }, 200)
        },
        [activeIndex, isTransitioning]
    )

    const goPrev = useCallback(() => {
        goTo(activeIndex === 0 ? images.length - 1 : activeIndex - 1)
    }, [activeIndex, images.length, goTo])

    const goNext = useCallback(() => {
        goTo(activeIndex === images.length - 1 ? 0 : activeIndex + 1)
    }, [activeIndex, images.length, goTo])

    if (!images || images.length === 0) {
        return (
            <div className="gallery-v2">
                <div className="gallery-v2-main skeleton" />
            </div>
        )
    }

    const mainImage = images[activeIndex]
    const mainUrl = urlFor(mainImage)
        .width(1200)
        .height(900)
        .format('webp')
        .quality(85)
        .url()

    return (
        <div className="gallery-v2">
            {/* Main image */}
            <div className="gallery-v2-main">
                <div className={`gallery-v2-img-wrap ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
                    <Image
                        src={mainUrl}
                        alt={mainImage.alt || 'Moto'}
                        fill
                        sizes="(max-width: 768px) 100vw, 70vw"
                        style={{ objectFit: 'cover' }}
                        priority={activeIndex === 0}
                    />
                </div>

                {/* Navigation arrows */}
                {images.length > 1 && (
                    <>
                        <button className="gallery-v2-arrow gallery-v2-arrow--prev" onClick={goPrev} aria-label="Immagine precedente">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <button className="gallery-v2-arrow gallery-v2-arrow--next" onClick={goNext} aria-label="Immagine successiva">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    </>
                )}

                {/* Counter */}
                {images.length > 1 && (
                    <div className="gallery-v2-counter">
                        {activeIndex + 1} / {images.length}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="gallery-v2-thumbs">
                    {images.map((img, idx) => {
                        const thumbUrl = urlFor(img)
                            .width(300)
                            .height(225)
                            .format('webp')
                            .quality(70)
                            .url()
                        return (
                            <button
                                key={idx}
                                className={`gallery-v2-thumb ${idx === activeIndex ? 'active' : ''}`}
                                onClick={() => goTo(idx)}
                                aria-label={`Vai all'immagine ${idx + 1}`}
                            >
                                <Image
                                    src={thumbUrl}
                                    alt={img.alt || `Immagine ${idx + 1}`}
                                    fill
                                    sizes="120px"
                                    style={{ objectFit: 'cover' }}
                                    loading="lazy"
                                />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
