import type { Metadata } from 'next'
import { client } from '@/lib/sanity.client'
import { allUsedMotorcyclesQuery, allBrandsQuery } from '@/lib/sanity.queries'
import { UsedCatalogClient } from '@/components/UsedCatalogClient'

export const revalidate = 3600

export const metadata: Metadata = {
    title: 'Moto Usate — Catalogo Usato',
    description:
        'Scopri tutte le moto usate disponibili presso Avanzi Moto. KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio usate garantite.',
    openGraph: {
        title: 'Moto Usate — Avanzi Moto',
        description:
            'Catalogo completo moto usate multimarca. Concessionario Avanzi Moto.',
    },
}

export default async function UsatoPage() {
    const [motorcycles, brands] = await Promise.all([
        client.fetch(allUsedMotorcyclesQuery),
        client.fetch(allBrandsQuery),
    ])

    return (
        <>
            <div className="brand-header">
                <span className="brand-header-label">CATALOGO</span>
                <h1>Moto Usate</h1>
                <p>
                    Scopri tutte le moto usate disponibili presso Avanzi Moto,
                    concessionario ufficiale a Bagnolo Mella, BRESCIA.
                </p>
            </div>
            <section className="section">
                <UsedCatalogClient
                    motorcycles={motorcycles || []}
                    brands={brands || []}
                />
            </section>
        </>
    )
}
