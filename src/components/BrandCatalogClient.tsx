'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { FilterSidebar } from '@/components/FilterSidebar'
import { MotorcycleCard } from '@/components/MotorcycleCard'

interface Motorcycle {
    _id: string
    model: string
    slug: { current: string }
    year: number
    type: string
    condition: string
    price?: number
    cilindrata?: number
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

const PAGE_SIZE = 12

export function BrandCatalogClient({
    motorcycles,
}: {
    motorcycles: Motorcycle[]
}) {
    const [activeType, setActiveType] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const sentinelRef = useRef<HTMLDivElement>(null)

    const uniqueTypes = useMemo(() => {
        const types = new Set(motorcycles.map((m) => m.type))
        return ['all', ...Array.from(types)]
    }, [motorcycles])

    const yearRange = useMemo<[number, number]>(() => {
        if (motorcycles.length === 0) return [2020, 2026]
        const years = motorcycles.map((m) => m.year)
        return [Math.min(...years), Math.max(...years)]
    }, [motorcycles])

    const maxPrice = useMemo(() => {
        const prices = motorcycles.filter((m) => m.price).map((m) => m.price!)
        if (prices.length === 0) return 50000
        return Math.ceil(Math.max(...prices) / 1000) * 1000
    }, [motorcycles])

    const maxCilindrata = useMemo(() => {
        const cilindrate = motorcycles.filter((m) => m.cilindrata).map((m) => m.cilindrata!)
        if (cilindrate.length === 0) return 2000
        return Math.ceil(Math.max(...cilindrate) / 100) * 100
    }, [motorcycles])

    const [activeYearMin, setActiveYearMin] = useState(yearRange[0])
    const [activeYearMax, setActiveYearMax] = useState(yearRange[1])
    const [activePriceMin, setActivePriceMin] = useState(0)
    const [activePriceMax, setActivePriceMax] = useState(maxPrice)
    const [activeCilindrataMin, setActiveCilindrataMin] = useState(0)
    const [activeCilindrataMax, setActiveCilindrataMax] = useState(maxCilindrata)

    const filtered = motorcycles.filter((m) => {
        const typeMatch = activeType === 'all' || m.type === activeType
        const yearMatch = m.year >= activeYearMin && m.year <= activeYearMax
        const priceMatch = !m.price || (m.price >= activePriceMin && m.price <= activePriceMax)

        const isCilindrataFiltered = activeCilindrataMin > 0 || activeCilindrataMax < maxCilindrata
        const cilindrataMatch = !isCilindrataFiltered ||
            (m.cilindrata !== undefined && m.cilindrata !== null && m.cilindrata >= activeCilindrataMin && m.cilindrata <= activeCilindrataMax)

        const searchMatch = searchQuery === '' ||
            `${m.brand?.name || ''} ${m.model}`.toLowerCase().includes(searchQuery.toLowerCase())

        return typeMatch && yearMatch && priceMatch && cilindrataMatch && searchMatch
    })

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE)
    }, [activeType, activeYearMin, activeYearMax, activePriceMin, activePriceMax, activeCilindrataMin, activeCilindrataMax, searchQuery])

    const visibleMotos = filtered.slice(0, visibleCount)
    const hasMore = visibleCount < filtered.length

    // IntersectionObserver for infinite scroll
    const loadMore = useCallback(() => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
    }, [filtered.length])

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    loadMore()
                }
            },
            { rootMargin: '200px' }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, loadMore])

    return (
        <div className="catalog-layout">
            <div className="catalog-main">
                <div className="mobile-catalog-header">
                    <FilterSidebar
                        types={uniqueTypes}
                        activeType={activeType}
                        onTypeChange={setActiveType}
                        yearRange={yearRange}
                        activeYearMin={activeYearMin}
                        activeYearMax={activeYearMax}
                        onYearRangeChange={(min, max) => {
                            setActiveYearMin(min)
                            setActiveYearMax(max)
                        }}
                        priceMax={maxPrice}
                        activePriceMin={activePriceMin}
                        activePriceMax={activePriceMax}
                        onPriceRangeChange={(min, max) => {
                            setActivePriceMin(min)
                            setActivePriceMax(max)
                        }}
                        cilindrataMax={maxCilindrata}
                        activeCilindrataMin={activeCilindrataMin}
                        activeCilindrataMax={activeCilindrataMax}
                        onCilindrataRangeChange={(min, max) => {
                            setActiveCilindrataMin(min)
                            setActiveCilindrataMax(max)
                        }}
                        totalResults={filtered.length}
                    />

                    <div className="catalog-search-mobile">
                        <div className="search-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="catalog-search-input"
                            placeholder="CERCA MODELLO..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="catalog-right-col">
                    {/* Desktop Search - Rendered at top of the catalog grid on wide screens */}
                    <div className="catalog-search-desktop">
                        <input
                            type="text"
                            className="catalog-search-input"
                            placeholder="Cerca modello della moto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {filtered.length > 0 ? (
                        <>
                            <div className="catalog-grid">
                                {visibleMotos.map((moto) => (
                                    <MotorcycleCard key={moto._id} motorcycle={moto} />
                                ))}
                            </div>
                            {hasMore && (
                                <div ref={sentinelRef} className="catalog-sentinel">
                                    <span className="catalog-loading">Caricamento…</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state">
                            <h3>NESSUNA MOTO TROVATA</h3>
                            <p>Prova a modificare i filtri o la ricerca per trovare la tua moto.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
