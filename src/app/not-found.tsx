import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Pagina non trovata | Avanzi Moto',
    description: 'La pagina che cerchi non esiste o è stata spostata.',
}

export default function NotFound() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px 24px',
        }}>
            <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 'clamp(8rem, 20vw, 14rem)',
                fontWeight: 900,
                color: 'var(--orange)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
            }}>
                404
            </span>
            <h1 style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginTop: '16px',
                marginBottom: '12px',
            }}>
                PAGINA NON TROVATA
            </h1>
            <p style={{
                color: 'var(--text-dim)',
                fontSize: '1rem',
                maxWidth: '450px',
                lineHeight: 1.7,
                marginBottom: '32px',
            }}>
                La pagina che stai cercando non esiste o è stata spostata.
                Torna alla homepage per scoprire le nostre moto.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link href="/" className="detail-v2-cta-btn" style={{ width: 'auto', marginBottom: 0 }}>
                    TORNA ALLA HOME
                </Link>
                <Link href="/contattaci" className="detail-v2-cta-btn detail-v2-cta-btn--outline" style={{ width: 'auto', marginBottom: 0 }}>
                    CONTATTACI
                </Link>
            </div>
        </section>
    )
}
