import type { Metadata } from 'next'
import { client } from '@/lib/sanity.client'
import { allUsedMotorcyclesQuery, allBrandsQuery } from '@/lib/sanity.queries'
import { UsedCatalogClient } from '@/components/UsedCatalogClient'

export const revalidate = 3600

export const metadata: Metadata = {
    title: 'Moto Usate a Brescia: Usato Garantito Multimarca | Avanzi Moto',
    description:
        'Scopri le migliori moto usate a Brescia da Avanzi Moto a Bagnolo Mella. Usato garantito e periziato KTM, Husqvarna, Voge, Kymco e altri marchi. Valutiamo il tuo usato.',
    keywords: ['moto usate Brescia', 'concessionario moto usate', 'usato moto garantito Lombardia', 'vendita moto usate Brescia', 'KTM usate Brescia', 'ritiro usato moto', 'Avanzi Moto'],
    openGraph: {
        title: 'Moto Usate a Brescia: Usato Garantito | Avanzi Moto',
        description:
            'Il miglior usato periziato e garantito a Brescia. Scopri il catalogo completo di moto usate multimarca.',
        type: 'website',
        locale: 'it_IT',
        siteName: 'Avanzi Moto',
    },
}

export default async function UsatoPage() {
    const [motorcycles, brands] = await Promise.all([
        client.fetch(allUsedMotorcyclesQuery),
        client.fetch(allBrandsQuery),
    ])

    return (
        <>
            {/* ── SEO JSON-LD per l'Usato ── */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Store",
                        "name": "Avanzi Moto - Dipartimento Moto Usate Brescia",
                        "description": "Vendita moto usate multimarca, usato garantito, periziato e ritiri permute a Brescia.",
                        "url": "https://avanzimoto.it/usato",
                        "telephone": "+39 030 620134",
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": "Viale Europa, 3/A",
                            "addressLocality": "Bagnolo Mella",
                            "postalCode": "25021",
                            "addressRegion": "BS",
                            "addressCountry": "IT"
                        },
                        "department": {
                            "@type": "MotorcycleDealer",
                            "name": "Showroom Moto Usate"
                        }
                    })
                }}
            />

            <div className="brand-header">
                <span className="brand-header-label">CATALOGO</span>
                <h1>
                    Moto Usate
                    <span className="sr-only"> Garantite a Brescia - Avanzi Moto</span>
                </h1>
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

            {/* ── SEO CONTENT BLOCK ── */}
            <section className="seo-content-block">
                <div className="seo-content-inner">
                    <h2>Moto Usate a Brescia: Usato Garantito e Periziato</h2>
                    <p>
                        Sei alla ricerca di <strong>moto usate a Brescia</strong> o in tutta la Lombardia? Da <strong>Avanzi Moto</strong> a <strong>Bagnolo Mella</strong> troverai un vasto parco di moto e scooter di seconda mano rigorosamente selezionati. Che tu stia cercando un'avventurosa <strong>KTM usata</strong>, un'affidabile moto giapponese o uno scooter per la città, il nostro showroom offre solo l'eccellenza.
                    </p>
                    <p>
                        Tutto il nostro <strong>usato moto è garantito per 12 mesi</strong> e meticolosamente periziato prima della messa in vendita dalla nostra <strong>officina specializzata</strong>. Ritiriamo e permutiamo il tuo usato offrendoti le migliori valutazioni di mercato. Visita il concessionario Avanzi Moto per un test ride o per richiedere un preventivo gratuito e personalizzato.
                    </p>
                </div>
            </section>
        </>
    )
}
