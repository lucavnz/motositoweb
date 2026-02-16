'use client'

interface FilterBarProps {
    types: string[]
    activeType: string
    onTypeChange: (type: string) => void
    brands?: Array<{ _id: string; name: string; slug: { current: string } }>
    activeBrand?: string
    onBrandChange?: (brand: string) => void
}

const typeLabels: Record<string, string> = {
    all: 'Tutti',
    strada: 'Strada',
    enduro: 'Enduro',
    cross: 'Cross',
    scooter: 'Scooter',
}

export function FilterBar({
    types,
    activeType,
    onTypeChange,
    brands,
    activeBrand,
    onBrandChange,
}: FilterBarProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            <div className="filter-bar">
                {types.map((type) => (
                    <button
                        key={type}
                        className={`filter-btn ${activeType === type ? 'active' : ''}`}
                        onClick={() => onTypeChange(type)}
                    >
                        {typeLabels[type] || type}
                    </button>
                ))}
            </div>
            {brands && brands.length > 0 && onBrandChange && (
                <div className="filter-bar">
                    <button
                        className={`filter-btn ${activeBrand === 'all' ? 'active' : ''}`}
                        onClick={() => onBrandChange('all')}
                    >
                        Tutti i marchi
                    </button>
                    {brands.map((brand) => (
                        <button
                            key={brand._id}
                            className={`filter-btn ${activeBrand === brand.slug.current ? 'active' : ''}`}
                            onClick={() => onBrandChange(brand.slug.current)}
                        >
                            {brand.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
