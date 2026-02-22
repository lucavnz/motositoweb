import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { client } from '@/lib/sanity.client'
import { urlFor } from '@/lib/sanity.image'
import {
  homepageContentQuery,
  latestMotorcyclesQuery,
  siteSettingsQuery,
} from '@/lib/sanity.queries'
import { MotorcycleCard } from '@/components/MotorcycleCard'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Avanzi Moto | Concessionario Ufficiale KTM, Husqvarna, Voge a Brescia',
  description:
    'Avanzi Moto è il tuo concessionario ufficiale a Bagnolo Mella (Brescia) per moto nuove e usate KTM, Husqvarna, Voge, Kymco, Beta, Fantic e Piaggio. Oltre 70 anni di esperienza, officina specializzata e showroom.',
  keywords: [
    'concessionario moto Brescia',
    'concessionario KTM Brescia',
    'concessionario Husqvarna Brescia',
    'concessionario Voge Brescia',
    'concessionario Kymco Brescia',
    'moto usate Brescia',
    'moto nuove Brescia',
    'vendita moto Brescia',
    'officina moto Brescia',
    'Avanzi Moto',
    'Bagnolo Mella'
  ],
  openGraph: {
    title: 'Avanzi Moto | Concessionario Ufficiale Moto a Brescia',
    description: 'Concessionario ufficiale KTM, Husqvarna, Voge e Kymco a Bagnolo Mella (BS). Scopri le nostre offerte su moto nuove e usate garantite.',
    url: 'https://avanzimoto.it',
    siteName: 'Avanzi Moto',
    locale: 'it_IT',
    type: 'website',
  },
}

// ── Fallback data for the 3 featured blocks ──
const FEATURED_BLOCKS = [
  {
    key: 'featuredBlock1',
    tag: 'DAL 1950',
    fallbackTitle: 'PASSIONE SU DUE RUOTE',
    fallbackDesc:
      'Oltre 70 anni di esperienza nel mondo delle moto. Avanzi Moto è il punto di riferimento per ogni motociclista a Brescia e provincia.',
  },
  {
    key: 'featuredBlock2',
    tag: 'LA TUA SCELTA',
    fallbackTitle: 'MOTO PER OGNI STILE',
    fallbackDesc:
      'Dalla strada al fuoristrada, dallo scooter alla naked. Trova il mezzo perfetto per le tue avventure tra i brand più prestigiosi al mondo.',
  },
  {
    key: 'featuredBlock3',
    tag: 'AL TUO FIANCO',
    fallbackTitle: 'ASSISTENZA DEDICATA',
    fallbackDesc:
      'Il nostro team di tecnici specializzati si prende cura della tua moto con competenza, passione e ricambi originali.',
  },
]

export default async function HomePage() {
  const [homepage, latestBikes, settings] = await Promise.all([
    client.fetch(homepageContentQuery),
    client.fetch(latestMotorcyclesQuery),
    client.fetch(siteSettingsQuery),
  ])

  const heroUrl = homepage?.heroImage
    ? urlFor(homepage.heroImage).width(1920).height(1080).format('webp').quality(80).url()
    : null

  // ctaImage no longer used

  // Build image URLs for the 4 featured blocks
  const blockImages = FEATURED_BLOCKS.map(({ key }) => {
    const img = homepage?.[`${key}Image` as keyof typeof homepage]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return img ? urlFor(img as any).width(960).height(700).format('webp').quality(80).url() : null
  })

  return (
    <>
      {/* ── SEO JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MotorcycleDealer",
            "name": settings?.siteName || "Avanzi Moto",
            "image": heroUrl || "",
            "@id": "https://avanzimoto.it",
            "url": "https://avanzimoto.it",
            "telephone": settings?.phone || "+39 030 620134",
            "email": settings?.email || "",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": settings?.address || "Viale Europa, 3/A",
              "addressLocality": "Bagnolo Mella",
              "postalCode": "25021",
              "addressRegion": "BS",
              "addressCountry": "IT"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 45.4309,
              "longitude": 10.1837
            },
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                "opens": "08:30",
                "closes": "12:00"
              },
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday"],
                "opens": "14:00",
                "closes": "19:00"
              },
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": "Saturday",
                "opens": "14:00",
                "closes": "18:00"
              }
            ],
            "brands": ["KTM", "Husqvarna", "Voge", "Kymco", "Beta", "Fantic", "Piaggio"]
          })
        }}
      />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-image-wrapper">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={homepage?.heroImage?.alt || 'Avanzi Moto Hero'}
              fill
              sizes="100vw"
              style={{ objectFit: 'cover' }}
              priority
            />
          ) : (
            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
          )}
        </div>

        <div className="hero-content">
          <span className="hero-tag">BRESCIA, DAL 1950</span>
          <h1 className="hero-title">
            AVANZI MOTO
            <span className="sr-only"> - Concessionario Ufficiale Moto KTM, Husqvarna, Voge a Brescia</span>
          </h1>
          <p className="hero-subtitle">
            Concessionario ufficiale di moto{' '}
            <strong>KTM</strong>, <strong>HUSQVARNA</strong>,{' '}
            <strong>KYMCO</strong> e <strong>VOGE</strong>{' '}
            a Bagnolo Mella, in provincia di Brescia.
          </p>
        </div>

        <div className="hero-scroll">
          <span>SCORRI</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── CHI SIAMO ── */}
      <section className="about-section">
        <div className="featured-blocks-header">
          <span className="featured-blocks-tag">SCOPRI</span>
          <h2 className="featured-blocks-title">
            CHI <span>SIAMO</span>
          </h2>
          <p className="featured-blocks-subtitle">
            Più di un concessionario. Una passione che dura da oltre 70 anni.
          </p>
        </div>

        {/* Stats row */}
        <div className="about-stats">
          <div className="about-stat-card">
            <span className="about-stat-number">70</span>
            <span className="about-stat-label">ANNI DI ESPERIENZA</span>
          </div>
          <div className="about-stat-card">
            <span className="about-stat-number">7</span>
            <span className="about-stat-label">BRAND UFFICIALI</span>
          </div>
          <div className="about-stat-card">
            <span className="about-stat-number">1K</span>
            <span className="about-stat-label">CLIENTI SODDISFATTI</span>
          </div>
        </div>

        {/* Value proposition cards */}
        <div className="about-values">
          <div className="about-value-card about-value-card--wide">
            {blockImages[0] ? (
              <Image
                src={blockImages[0]}
                alt="Passione su due ruote"
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div className="about-value-card-bg" />
            )}
            <div className="about-value-card-overlay" />
            <div className="about-value-card-content">
              <span className="about-value-tag">DAL 1950</span>
              <h3 className="about-value-heading">PASSIONE SU DUE RUOTE</h3>
              <p className="about-value-desc">
                Oltre 70 anni di esperienza nel mondo delle moto.
                Avanzi Moto è il punto di riferimento per ogni motociclista a Brescia e provincia.
              </p>
            </div>
          </div>
          <div className="about-value-card">
            {blockImages[1] ? (
              <Image
                src={blockImages[1]}
                alt="Moto per ogni stile"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div className="about-value-card-bg" />
            )}
            <div className="about-value-card-overlay" />
            <div className="about-value-card-content">
              <span className="about-value-tag">LA TUA SCELTA</span>
              <h3 className="about-value-heading">MOTO PER OGNI STILE</h3>
              <p className="about-value-desc">
                Dalla strada al fuoristrada, dallo scooter alla naked. Trova il mezzo perfetto per le tue avventure.
              </p>
            </div>
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

      {/* ── IL NOSTRO IMPEGNO ── */}
      <section className="services-section">
        <div className="featured-blocks-header">
          <span className="featured-blocks-tag">SERVIZI</span>
          <h2 className="featured-blocks-title">
            IL NOSTRO <span>IMPEGNO</span>
          </h2>
          <p className="featured-blocks-subtitle">
            Assistenza, ricambi e passione. Tutto ciò che serve per il tuo ride.
          </p>
        </div>

        <div className="services-grid">
          <div className="service-card">
            <div className="service-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
            </div>
            <h3 className="service-card-title">ASSISTENZA DEDICATA</h3>
            <p className="service-card-desc">
              Il nostro team di tecnici specializzati si prende cura della tua moto con competenza, passione e ricambi originali.
            </p>
            <div className="service-card-line" />
          </div>
          <div className="service-card">
            <div className="service-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
            </div>
            <h3 className="service-card-title">PROVA SU STRADA</h3>
            <p className="service-card-desc">
              Prova la moto dei tuoi sogni senza impegno. Il tuo prossimo ride ti sta aspettando nel nostro showroom.
            </p>
            <div className="service-card-line" />
          </div>
          <div className="service-card">
            <div className="service-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            </div>
            <h3 className="service-card-title">RICAMBI ORIGINALI</h3>
            <p className="service-card-desc">
              Ampia disponibilità di ricambi originali e accessori per tutti i brand che trattiamo.
            </p>
            <div className="service-card-line" />
          </div>
        </div>

        {/* Wide feature card */}
        <div className="services-feature">
          <div className="about-value-card about-value-card--full">
            {blockImages[2] ? (
              <Image
                src={blockImages[2]}
                alt="Il tuo prossimo ride"
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div className="about-value-card-bg" />
            )}
            <div className="about-value-card-overlay" />
            <div className="about-value-card-content about-value-card-content--center">
              <span className="about-value-tag">VIENI A TROVARCI</span>
              <h3 className="about-value-heading">IL TUO PROSSIMO RIDE</h3>
              <p className="about-value-desc">
                Vieni in concessionario per una prova su strada senza impegno. Ti aspettiamo a Bagnolo Mella, Brescia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="cta-section">
        <h2>
          {homepage?.ctaTitle || (
            <>
              NON <span>ASPETTARE</span>
            </>
          )}
        </h2>
        <p>
          {homepage?.ctaSubtitle ||
            'Vieni a trovarci in concessionario. Prova la tua prossima moto.'}
        </p>
      </section>

      {/* ── SEO CONTENT BLOCK ── */}
      <section className="seo-content-block">
        <div className="seo-content-inner">
          <h2>Concessionario Moto Avanzi Moto a Brescia: Oltre 70 Anni di Passione</h2>
          <p>
            Dal 1950, <strong>Avanzi Moto</strong> è il punto di riferimento a <strong>Bagnolo Mella (Brescia)</strong> e in tutta la Lombardia per gli appassionati delle due ruote. Come <strong>concessionario ufficiale KTM, Husqvarna, Voge, Kymco, Beta, Fantic e Piaggio</strong>, offriamo un vasto catalogo di moto nuove e usate garantite per ogni esigenza: dalla guida sportiva in pista, ai viaggi enduro e adventure, fino agli scooter per la mobilità urbana.
          </p>
          <p>
            Nel nostro showroom troverai non solo i migliori modelli sul mercato, ma anche un'<strong>officina moto specializzata</strong> con ricambi originali, abbigliamento tecnico, accessori e un team di esperti pronto a fornirti <strong>assistenza dedicata</strong> tecnica e commerciale. Prova la tua prossima moto su strada o valuta un usato sicuro e periziato. Visita <strong>Avanzi Moto</strong> per scoprire tutte le ultime novità delle case motociclistiche e vivere l'esperienza d'acquisto migliore d'Italia.
          </p>
        </div>
      </section>
    </>
  )
}
