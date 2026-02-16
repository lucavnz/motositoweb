import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { client } from '@/lib/sanity.client'
import { urlFor } from '@/lib/sanity.image'
import {
  homepageContentQuery,
  allBrandsQuery,
  latestMotorcyclesQuery,
} from '@/lib/sanity.queries'
import { MotorcycleCard } from '@/components/MotorcycleCard'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Avanzi Moto — Concessionario Moto KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio',
  description:
    'Avanzi Moto: concessionario ufficiale multimarca. Scopri la nostra gamma di moto nuove e usate KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio.',
}

export default async function HomePage() {
  const [homepage, brands, latestBikes] = await Promise.all([
    client.fetch(homepageContentQuery),
    client.fetch(allBrandsQuery),
    client.fetch(latestMotorcyclesQuery),
  ])

  const heroUrl = homepage?.heroImage
    ? urlFor(homepage.heroImage).width(1920).height(1080).format('webp').quality(80).url()
    : null

  const featuredUrl = homepage?.featuredImage
    ? urlFor(homepage.featuredImage).width(960).height(600).format('webp').quality(80).url()
    : null

  const ctaUrl = homepage?.ctaImage
    ? urlFor(homepage.ctaImage).width(1920).height(800).format('webp').quality(75).url()
    : null

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

      {/* ── BRANDS STRIP ── */}
      {brands && brands.length > 0 && (
        <section className="brands-strip">
          {brands.map(
            (brand: {
              _id: string
              name: string
              slug: { current: string }
              logo?: { asset: { _ref?: string; _id?: string; url?: string } }
            }) =>
              brand.logo ? (
                <Link key={brand._id} href={`/marchi/${brand.slug.current}`}>
                  <Image
                    src={urlFor(brand.logo).height(80).format('webp').url()}
                    alt={brand.name}
                    width={100}
                    height={40}
                    className="brand-logo-item"
                    style={{ objectFit: 'contain' }}
                    loading="lazy"
                  />
                </Link>
              ) : (
                <Link
                  key={brand._id}
                  href={`/marchi/${brand.slug.current}`}
                  className="brand-logo-item"
                  style={{
                    fontFamily: 'var(--font-barlow)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    opacity: 0.5,
                    color: 'var(--text)',
                  }}
                >
                  {brand.name}
                </Link>
              )
          )}
        </section>
      )}

      {/* ── FEATURED SECTION ── */}
      <section className="featured-section">
        <div className="featured-image">
          {featuredUrl ? (
            <Image
              src={featuredUrl}
              alt={homepage?.featuredImage?.alt || 'Featured'}
              fill
              sizes="50vw"
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
          )}
        </div>
        <div className="featured-text">
          <h2>
            {homepage?.featuredTitle || (
              <>
                IL TUO PROSSIMO <span>RIDE</span>
              </>
            )}
          </h2>
          <p>
            {homepage?.featuredDescription ||
              'Dalle strade alle piste, dai sentieri agli spostamenti urbani. Trova la moto perfetta per il tuo stile di vita.'}
          </p>
        </div>
      </section>

      {/* ── LATEST BIKES ── */}
      {latestBikes && latestBikes.length > 0 && (
        <section className="latest-section">
          <div className="section-header">
            <h2>
              ULTIME <span>NOVITÀ</span>
            </h2>
            <span className="section-line" />
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
