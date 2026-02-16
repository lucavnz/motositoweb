'use client'

import { useState, useMemo } from 'react'
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
    kilometers?: number
    shortDescription?: string
    images?: Array<{
        asset: { _ref?: string; _id?: string; url?: string }
        alt?: string
    }>
    brand?: {
        _id: string
        name: string
        slug: { current: string }
    }
}

interface Brand {
    _id: string
    name: string
    slug: { current: string }
}

export function UsedCatalogClient({
    motorcycles,
    brands,
}: {
    motorcycles: Motorcycle[]
    brands: Brand[]
}) {
    const [activeType, setActiveType] = useState('all')
    const [activeBrand, setActiveBrand] = useState('all')

    const uniqueTypes = useMemo(() => {
        const types = new Set(motorcycles.map((m) => m.type))
        return ['all', ...Array.from(types)]
    }, [motorcycles])

    const yearRange = useMemo<[number, number]>(() => {
        if (motorcycles.length === 0) return [2015, 2026]
        const years = motorcycles.map((m) => m.year)
        return [Math.min(...years), Math.max(...years)]
    }, [motorcycles])

    const maxPrice = useMemo(() => {
        const prices = motorcycles.filter((m) => m.price).map((m) => m.price!)
        if (prices.length === 0) return 30000
        return Math.ceil(Math.max(...prices) / 1000) * 1000
    }, [motorcycles])

    const [activeYearMin, setActiveYearMin] = useState(yearRange[0])
    const [activeYearMax, setActiveYearMax] = useState(yearRange[1])
    const [activePriceMax, setActivePriceMax] = useState(maxPrice)

    const filtered = motorcycles.filter((m) => {
        const typeMatch = activeType === 'all' || m.type === activeType
        const brandMatch = activeBrand === 'all' || m.brand?.slug.current === activeBrand
        const yearMatch = m.year >= activeYearMin && m.year <= activeYearMax
        const priceMatch = !m.price || m.price <= activePriceMax
        return typeMatch && brandMatch && yearMatch && priceMatch
    })

    return (
        <div className="catalog-layout">
            <div className="catalog-main">
                <FilterSidebar
                    types={uniqueTypes}
                    activeType={activeType}
                    onTypeChange={setActiveType}
                    brands={brands}
                    activeBrand={activeBrand}
                    onBrandChange={setActiveBrand}
                    yearRange={yearRange}
                    activeYearMin={activeYearMin}
                    activeYearMax={activeYearMax}
                    onYearRangeChange={(min, max) => {
                        setActiveYearMin(min)
                        setActiveYearMax(max)
                    }}
                    priceMax={maxPrice}
                    activePriceMax={activePriceMax}
                    onPriceMaxChange={setActivePriceMax}
                    totalResults={filtered.length}
                />
                {filtered.length > 0 ? (
                    <div className="catalog-grid">
                        {filtered.map((moto) => (
                            <MotorcycleCard key={moto._id} motorcycle={moto} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <h3>NESSUNA MOTO TROVATA</h3>
                        <p>Prova a modificare i filtri per trovare la tua moto usata.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
