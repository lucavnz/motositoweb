import type { Metadata } from 'next'
import { client } from '@/lib/sanity.client'
import { latestMotorcyclesQuery, siteSettingsQuery } from '@/lib/sanity.queries'
import { MotorcycleCard } from '@/components/MotorcycleCard'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
    title: 'Contattaci | Avanzi Moto',
    description: 'Contatta Avanzi Moto a Brescia. Telefono, WhatsApp, Email e Orari di apertura.',
    openGraph: {
        title: 'Contattaci | Avanzi Moto',
        description: 'Contatta Avanzi Moto a Brescia. Telefono, WhatsApp, Email e Orari di apertura.',
        url: 'https://avanzimoto.it/contattaci',
        siteName: 'Avanzi Moto',
        locale: 'it_IT',
        type: 'website',
    },
    alternates: {
        canonical: 'https://avanzimoto.it/contattaci',
    },
}

export default async function ContactPage() {
    const [latestBikes, settings] = await Promise.all([
        client.fetch(latestMotorcyclesQuery),
        client.fetch(siteSettingsQuery),
    ])

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "ContactPage",
                        "name": "Contattaci | Avanzi Moto",
                        "url": "https://avanzimoto.it/contattaci",
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "telephone": "030 620452",
                            "contactType": "customer service",
                            "email": "info@avanzimoto.it",
                            "areaServed": "IT",
                            "availableLanguage": "Italian"
                        }
                    })
                }}
            />

            {/* ── HEADER & CONTACT CARDS ── */}
            <section className="services-section" style={{ paddingTop: '150px' }}>
                <div className="featured-blocks-header">
                    <span className="featured-blocks-tag">SIAMO QUI PER TE</span>
                    <h1 className="featured-blocks-title" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', marginBottom: '16px' }}>
                        CONTATTA<span>CI</span>
                    </h1>
                    <p className="featured-blocks-subtitle" style={{ maxWidth: '600px', marginInline: 'auto' }}>
                        Hai domande su una moto, un ricambio o un intervento di officina?
                        Siamo a tua disposizione. Chiamaci, scrivici su WhatsApp o mandaci un'email.
                    </p>
                </div>

                <div className="services-grid" style={{ marginTop: '0px' }}>
                    {/* Email */}
                    <Link href="mailto:info@avanzimoto.it" className="service-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="service-card-icon" style={{ marginBottom: '24px' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                        </div>
                        <h3 className="service-card-title">EMAIL</h3>
                        <p className="service-card-desc" style={{ fontSize: '1.1rem', marginTop: '8px' }}>
                            info@avanzimoto.it
                        </p>
                    </Link>

                    {/* Telefono */}
                    <Link href="tel:030620452" className="service-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="service-card-icon" style={{ marginBottom: '24px' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        </div>
                        <h3 className="service-card-title">CHIAMATE</h3>
                        <p className="service-card-desc" style={{ fontSize: '1.1rem', marginTop: '8px' }}>
                            030 620452<br />
                            <span style={{ fontSize: '0.9rem', color: 'var(--orange)' }}>Rispondiamo subito</span>
                        </p>
                    </Link>

                    {/* WhatsApp */}
                    <Link href="https://wa.me/393473809996" target="_blank" rel="noopener noreferrer" className="service-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="service-card-icon" style={{ marginBottom: '24px' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                        </div>
                        <h3 className="service-card-title">WHATSAPP</h3>
                        <p className="service-card-desc" style={{ fontSize: '1.1rem', marginTop: '8px' }}>
                            347 3809996
                        </p>
                    </Link>
                    {/* Indirizzo */}
                    <Link href="https://maps.google.com/?q=Viale+Europa+3/A+25021+Bagnolo+Mella+BS" target="_blank" rel="noopener noreferrer" className="service-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="service-card-icon" style={{ marginBottom: '24px' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        </div>
                        <h3 className="service-card-title">INDIRIZZO</h3>
                        <p className="service-card-desc" style={{ fontSize: '1.1rem', marginTop: '8px' }}>
                            Viale Europa, 3/A<br />
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>25021 Bagnolo Mella (BS)</span>
                        </p>
                    </Link>

                    {/* Orari */}
                    <div className="service-card contact-hours-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div className="service-card-icon" style={{ marginBottom: '24px' }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        </div>
                        <h3 className="service-card-title">ORARI</h3>
                        <p className="service-card-desc" style={{ fontSize: '1.1rem', marginTop: '8px' }}>
                            Lun - Sab: 09:00 - 12:30 / 15:00 - 19:00<br />
                            <span style={{ fontSize: '0.9rem', color: 'var(--orange)' }}>Lunedì mattina e Domenica chiusi</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* ── LATEST BIKES ── */}
            {latestBikes && latestBikes.length > 0 && (
                <section className="latest-section">
                    <div className="featured-blocks-header">
                        <span className="featured-blocks-tag">CATALOGO</span>
                        <h2 className="featured-blocks-title">
                            ULTIME <span>NOVITÀ</span>
                        </h2>
                        <p className="featured-blocks-subtitle">
                            Le ultime moto arrivate nel nostro concessionario.
                        </p>
                    </div>
                    <div className="moto-grid">
                        {latestBikes.map(
                            (moto: {
                                _id: string
                                model: string
                                slug: { current: string }
                                year: number
                                type: string
                                condition: string
                                price?: number
                                images?: Array<{
                                    asset: { _ref?: string; _id?: string; url?: string }
                                    alt?: string
                                }>
                                brand?: { name: string; slug: { current: string } }
                            }) => (
                                <MotorcycleCard key={moto._id} motorcycle={moto} />
                            )
                        )}
                    </div>
                </section>
            )}
        </>
    )
}
