import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { client } from '@/lib/sanity.client'
import { navBrandsQuery, siteSettingsQuery } from '@/lib/sanity.queries'
import { Analytics } from '@vercel/analytics/next'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-barlow',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await client.fetch(siteSettingsQuery)
  return {
    metadataBase: new URL('https://avanzimoto.it'), // Adjust URL once in production if needed
    title: {
      default: settings?.siteName || 'Avanzi Moto — Concessionario Moto Brescia',
      template: `%s | ${settings?.siteName || 'Avanzi Moto'}`,
    },
    description:
      settings?.description ||
      'Avanzi Moto è il tuo concessionario ufficiale a Bagnolo Mella (Brescia) per KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio. Vendita moto nuove, usato garantito e officina.',
    keywords: [
      'concessionario moto Brescia',
      'concessionario moto Lombardia',
      'KTM Brescia',
      'Husqvarna Brescia',
      'Kymco Brescia',
      'Voge Brescia',
      'Beta Lombardia',
      'Fantic Motor Brescia',
      'Piaggio Brescia',
      'moto nuove Brescia',
      'moto usate garantite',
      'Avanzi Moto',
      'Bagnolo Mella',
    ],
    openGraph: {
      type: 'website',
      locale: 'it_IT',
      siteName: settings?.siteName || 'Avanzi Moto',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [brands, settings] = await Promise.all([
    client.fetch(navBrandsQuery),
    client.fetch(siteSettingsQuery),
  ])

  return (
    <html lang="it" className={`${barlowCondensed.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <Navbar brands={brands} />
        <main>{children}</main>
        <Footer settings={settings} brands={brands} />
        <Analytics />
      </body>
    </html>
  )
}
