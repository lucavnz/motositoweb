import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { client } from '@/lib/sanity.client'
import { urlFor } from '@/lib/sanity.image'
import {
  homepageContentQuery,
  latestMotorcyclesQuery,
} from '@/lib/sanity.queries'
import { MotorcycleCard } from '@/components/MotorcycleCard'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Avanzi Moto — Concessionario Moto KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio',
  description:
    'Avanzi Moto: concessionario ufficiale multimarca. Scopri la nostra gamma di moto nuove e usate KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio.',
}

// ── Fallback data for the 4 featured blocks ──
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
  {
    key: 'featuredBlock4',
    tag: 'VIENI A TROVARCI',
    fallbackTitle: 'IL TUO PROSSIMO RIDE',
    fallbackDesc:
      'Vieni in concessionario per una prova su strada senza impegno. Il tuo prossimo ride ti sta aspettando.',
  },
]

export default async function HomePage() {
  const [homepage, latestBikes] = await Promise.all([
    client.fetch(homepageContentQuery),
    client.fetch(latestMotorcyclesQuery),
  ])

  const heroUrl = homepage?.heroImage
    ? urlFor(homepage.heroImage).width(1920).height(1080).format('webp').quality(80).url()
    : null

  const ctaUrl = homepage?.ctaImage
    ? urlFor(homepage.ctaImage).width(1920).height(800).format('webp').quality(75).url()
    : null

  // Build image URLs for the 4 featured blocks
  const blockImages = FEATURED_BLOCKS.map(({ key }) => {
    const img = homepage?.[`${key}Image` as keyof typeof homepage]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return img ? urlFor(img as any).width(960).height(700).format('webp').quality(80).url() : null
  })

  return (
    <>
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
          <h1 className="hero-title">AVANZI MOTO</h1>
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

      {/* ── FEATURED BLOCKS — first pair ── */}
      <section className="featured-blocks">
        <div className="featured-blocks-header">
          <span className="featured-blocks-tag">SCOPRI</span>
          <h2 className="featured-blocks-title">
            CHI <span>SIAMO</span>
          </h2>
          <p className="featured-blocks-subtitle">
            Più di un concessionario. Una passione che dura da oltre 70 anni.
          </p>
        </div>

        {FEATURED_BLOCKS.slice(0, 2).map((block, idx) => {
          const title =
            (homepage?.[`${block.key}Title` as keyof typeof homepage] as string) ||
            block.fallbackTitle
          const desc =
            (homepage?.[`${block.key}Description` as keyof typeof homepage] as string) ||
            block.fallbackDesc
          const imgUrl = blockImages[idx]
          const isReversed = idx % 2 !== 0

          return (
            <div
              key={block.key}
              className={`featured-block ${isReversed ? 'featured-block--reverse' : ''}`}
            >
              <div className="featured-block-image">
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div className="featured-block-placeholder">
                    <span className="featured-block-placeholder-num">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              <div className="featured-block-text">
                <div className="featured-block-label">
                  <span className="featured-block-label-line" />
                  <span className="featured-block-label-num">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="featured-block-heading">{title}</h3>
                <p className="featured-block-desc">{desc}</p>
                <div className="featured-block-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )
        })}
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

      {/* ── FEATURED BLOCKS — second pair ── */}
      <section className="featured-blocks">
        <div className="featured-blocks-header">
          <span className="featured-blocks-tag">SERVIZI</span>
          <h2 className="featured-blocks-title">
            IL NOSTRO <span>IMPEGNO</span>
          </h2>
          <p className="featured-blocks-subtitle">
            Assistenza, ricambi e passione. Tutto ciò che serve per il tuo ride.
          </p>
        </div>

        {FEATURED_BLOCKS.slice(2, 4).map((block, idx) => {
          const realIdx = idx + 2
          const title =
            (homepage?.[`${block.key}Title` as keyof typeof homepage] as string) ||
            block.fallbackTitle
          const desc =
            (homepage?.[`${block.key}Description` as keyof typeof homepage] as string) ||
            block.fallbackDesc
          const imgUrl = blockImages[realIdx]
          const isReversed = realIdx % 2 !== 0

          return (
            <div
              key={block.key}
              className={`featured-block ${isReversed ? 'featured-block--reverse' : ''}`}
            >
              <div className="featured-block-image">
                {imgUrl ? (
                  <Image
                    src={imgUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div className="featured-block-placeholder">
                    <span className="featured-block-placeholder-num">
                      {String(realIdx + 1).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              <div className="featured-block-text">
                <div className="featured-block-label">
                  <span className="featured-block-label-line" />
                  <span className="featured-block-label-num">
                    {String(realIdx + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="featured-block-heading">{title}</h3>
                <p className="featured-block-desc">{desc}</p>
                <div className="featured-block-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* ── CTA SECTION ── */}
      <section className="cta-section">
        <div className="cta-bg">
          {ctaUrl ? (
            <Image
              src={ctaUrl}
              alt={homepage?.ctaImage?.alt || 'CTA Background'}
              fill
              sizes="100vw"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
          )}
        </div>
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
        <Link href="/usato" className="hero-cta">
          Esplora il catalogo
        </Link>
      </section>
    </>
  )
}
