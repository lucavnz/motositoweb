'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface FilterSidebarProps {
    types: string[]
    activeType: string
    onTypeChange: (type: string) => void
    yearRange?: [number, number]
    activeYearMin?: number
    activeYearMax?: number
    onYearRangeChange?: (min: number, max: number) => void
    priceMax?: number
    activePriceMax?: number
    onPriceMaxChange?: (price: number) => void
    brands?: Array<{ _id: string; name: string; slug: { current: string } }>
    activeBrand?: string
    onBrandChange?: (brand: string) => void
    totalResults: number
}

const typeLabels: Record<string, string> = {
    all: 'Tutti',
    strada: 'Strada',
    enduro: 'Enduro',
    cross: 'Cross',
    naked: 'Naked',
    adventure: 'Adventure',
    touring: 'Touring',
    scooter: 'Scooter',
    supermoto: 'Supermoto',
}

function formatPrice(value: number): string {
    if (value >= 50000) return '50.000+'
    return value.toLocaleString('it-IT')
}

/* ── Custom Range Slider ── */
function RangeSlider({
    min,
    max,
    value,
    onChange,
    formatLabel,
    step = 1,
    glowColor = 'var(--orange)',
}: {
    min: number
    max: number
    value: number
    onChange: (v: number) => void
    formatLabel: (v: number) => string
    step?: number
    glowColor?: string
}) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const pct = ((value - min) / (max - min)) * 100

    const updateValue = useCallback(
        (clientX: number) => {
            const track = trackRef.current
            if (!track) return
            const rect = track.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
            const raw = min + ratio * (max - min)
            const snapped = Math.round(raw / step) * step
            onChange(Math.max(min, Math.min(max, snapped)))
        },
        [min, max, step, onChange]
    )

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            setDragging(true)
            updateValue(e.clientX)
                ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
        },
        [updateValue]
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragging) return
            updateValue(e.clientX)
        },
        [dragging, updateValue]
    )

    const onPointerUp = useCallback(() => {
        setDragging(false)
    }, [])

    return (
        <div className="range-slider-container">
            <div
                className="range-slider-track"
                ref={trackRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <div className="range-slider-rail" />
                <div
                    className="range-slider-fill"
                    style={{ width: `${pct}%` }}
                />
                <div
                    className={`range-slider-thumb ${dragging ? 'range-slider-thumb--active' : ''}`}
                    style={{ left: `${pct}%` }}
                >
                    <div className="range-slider-thumb-glow" />
                    <div className="range-slider-thumb-dot" />
                </div>
            </div>
            <div className="range-slider-label">
                <span className="range-slider-value">{formatLabel(value)}</span>
            </div>
        </div>
    )
}

/* ── Dual Range Slider (for year) ── */
function DualRangeSlider({
    min,
    max,
    valueMin,
    valueMax,
    onChange,
    formatLabel,
    step = 1,
}: {
    min: number
    max: number
    valueMin: number
    valueMax: number
    onChange: (min: number, max: number) => void
    formatLabel: (v: number) => string
    step?: number
}) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
    const pctMin = ((valueMin - min) / (max - min)) * 100
    const pctMax = ((valueMax - min) / (max - min)) * 100

    const getRawValue = useCallback(
        (clientX: number) => {
            const track = trackRef.current
            if (!track) return min
            const rect = track.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
            const raw = min + ratio * (max - min)
            return Math.round(raw / step) * step
        },
        [min, max, step]
    )

    const onPointerDown = useCallback(
        (e: React.PointerEvent, thumb: 'min' | 'max') => {
            setActiveThumb(thumb)
                ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
        },
        []
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!activeThumb) return
            const raw = getRawValue(e.clientX)
            if (activeThumb === 'min') {
                onChange(Math.min(raw, valueMax), valueMax)
            } else {
                onChange(valueMin, Math.max(raw, valueMin))
            }
        },
        [activeThumb, getRawValue, onChange, valueMin, valueMax]
    )

    const onPointerUp = useCallback(() => {
        setActiveThumb(null)
    }, [])

    return (
        <div className="range-slider-container">
            <div
                className="range-slider-track"
                ref={trackRef}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <div className="range-slider-rail" />
                <div
                    className="range-slider-fill range-slider-fill--dual"
                    style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
                />
                <div
                    className={`range-slider-thumb ${activeThumb === 'min' ? 'range-slider-thumb--active' : ''}`}
                    style={{ left: `${pctMin}%` }}
                    onPointerDown={(e) => onPointerDown(e, 'min')}
                >
                    <div className="range-slider-thumb-glow" />
                    <div className="range-slider-thumb-dot" />
                </div>
                <div
                    className={`range-slider-thumb ${activeThumb === 'max' ? 'range-slider-thumb--active' : ''}`}
                    style={{ left: `${pctMax}%` }}
                    onPointerDown={(e) => onPointerDown(e, 'max')}
                >
                    <div className="range-slider-thumb-glow" />
                    <div className="range-slider-thumb-dot" />
                </div>
            </div>
            <div className="range-slider-labels-dual">
                <span className="range-slider-value">{formatLabel(valueMin)}</span>
                <span className="range-slider-separator">—</span>
                <span className="range-slider-value">{formatLabel(valueMax)}</span>
            </div>
        </div>
    )
}

/* ── Main Component ── */
export function FilterSidebar({
    types,
    activeType,
    onTypeChange,
    yearRange,
    activeYearMin,
    activeYearMax,
    onYearRangeChange,
    priceMax,
    activePriceMax,
    onPriceMaxChange,
    brands,
    activeBrand,
    onBrandChange,
    totalResults,
}: FilterSidebarProps) {
    const [mobileOpen, setMobileOpen] = useState(false)

    // Lock body scroll on mobile
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    const filterContent = (
        <div className="filter-sidebar-content">
            {/* Type filter */}
            <div className="filter-group">
                <div className="filter-group-header">
                    <h4 className="filter-group-title">Tipo</h4>
                    {activeType !== 'all' && (
                        <button className="filter-reset" onClick={() => onTypeChange('all')}>
                            Reset
                        </button>
                    )}
                </div>
                <div className="filter-chips">
                    {types.map((type) => (
                        <button
                            key={type}
                            className={`filter-chip ${activeType === type ? 'filter-chip--active' : ''}`}
                            onClick={() => {
                                onTypeChange(type)
                            }}
                        >
                            <span className="filter-chip-icon">
                                {activeType === type && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                            {typeLabels[type] || type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Brand filter (used page only) */}
            {brands && brands.length > 0 && onBrandChange && (
                <div className="filter-group">
                    <div className="filter-group-header">
                        <h4 className="filter-group-title">Marchio</h4>
                        {activeBrand !== 'all' && (
                            <button className="filter-reset" onClick={() => onBrandChange('all')}>
                                Reset
                            </button>
                        )}
                    </div>
                    <div className="filter-chips">
                        <button
                            className={`filter-chip ${activeBrand === 'all' ? 'filter-chip--active' : ''}`}
                            onClick={() => onBrandChange('all')}
                        >
                            <span className="filter-chip-icon">
                                {activeBrand === 'all' && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                            Tutti
                        </button>
                        {brands.map((brand) => (
                            <button
                                key={brand._id}
                                className={`filter-chip ${activeBrand === brand.slug.current ? 'filter-chip--active' : ''}`}
                                onClick={() => onBrandChange(brand.slug.current)}
                            >
                                <span className="filter-chip-icon">
                                    {activeBrand === brand.slug.current && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </span>
                                {brand.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Year dual-range slider */}
            {yearRange && onYearRangeChange && activeYearMin !== undefined && activeYearMax !== undefined && (
                <div className="filter-group">
                    <div className="filter-group-header">
                        <h4 className="filter-group-title">Anno</h4>
                        {(activeYearMin !== yearRange[0] || activeYearMax !== yearRange[1]) && (
                            <button className="filter-reset" onClick={() => onYearRangeChange(yearRange[0], yearRange[1])}>
                                Reset
                            </button>
                        )}
                    </div>
                    <DualRangeSlider
                        min={yearRange[0]}
                        max={yearRange[1]}
                        valueMin={activeYearMin}
                        valueMax={activeYearMax}
                        onChange={onYearRangeChange}
                        formatLabel={(v) => String(v)}
                        step={1}
                    />
                </div>
            )}

            {/* Price slider */}
            {priceMax !== undefined && activePriceMax !== undefined && onPriceMaxChange && (
                <div className="filter-group">
                    <div className="filter-group-header">
                        <h4 className="filter-group-title">Budget max</h4>
                        {activePriceMax !== priceMax && (
                            <button className="filter-reset" onClick={() => onPriceMaxChange(priceMax)}>
                                Reset
                            </button>
                        )}
                    </div>
                    <RangeSlider
                        min={0}
                        max={priceMax}
                        value={activePriceMax}
                        onChange={onPriceMaxChange}
                        formatLabel={(v) => `€ ${formatPrice(v)}`}
                        step={500}
                    />
                </div>
            )}

            {/* Result count */}
            <div className="filter-result-count">
                <div className="filter-result-pulse" />
                <span className="filter-result-number">{totalResults}</span>
                <span className="filter-result-label">
                    {totalResults === 1 ? 'risultato' : 'risultati'}
                </span>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile toggle button */}
            <button
                className="filter-mobile-toggle"
                onClick={() => setMobileOpen(true)}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <circle cx="9" cy="6" r="2" fill="currentColor" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <circle cx="15" cy="12" r="2" fill="currentColor" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                    <circle cx="7" cy="18" r="2" fill="currentColor" />
                </svg>
                FILTRI
                {(activeType !== 'all' || activeBrand !== 'all') && (
                    <span className="filter-mobile-badge" />
                )}
            </button>

            {/* Desktop sidebar */}
            <aside className="filter-sidebar">
                <div className="filter-sidebar-header">
                    <div className="filter-sidebar-title-row">
                        <div className="filter-sidebar-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <circle cx="9" cy="6" r="2" fill="var(--orange)" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <circle cx="15" cy="12" r="2" fill="var(--orange)" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                                <circle cx="7" cy="18" r="2" fill="var(--orange)" />
                            </svg>
                        </div>
                        <h3>FILTRI</h3>
                    </div>
                </div>
                {filterContent}
            </aside>

            {/* Mobile overlay */}
            <div
                className={`filter-mobile-overlay ${mobileOpen ? 'filter-mobile-overlay--open' : ''}`}
                onClick={() => setMobileOpen(false)}
            >
                <div
                    className={`filter-mobile-panel ${mobileOpen ? 'filter-mobile-panel--open' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="filter-mobile-header">
                        <h3>FILTRI</h3>
                        <button
                            className="filter-mobile-close"
                            onClick={() => setMobileOpen(false)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="6" y1="6" x2="18" y2="18" />
                                <line x1="18" y1="6" x2="6" y2="18" />
                            </svg>
                        </button>
                    </div>
                    {filterContent}
                </div>
            </div>
        </>
    )
}
