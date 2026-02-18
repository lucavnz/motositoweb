import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { client } from '@/lib/sanity.client'
import { allBrandsQuery, siteSettingsQuery } from '@/lib/sanity.queries'

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
    title: {
      default: settings?.siteName || 'Avanzi Moto — Concessionario Moto',
      template: `%s | ${settings?.siteName || 'Avanzi Moto'}`,
    },
    description:
      settings?.description ||
      'Avanzi Moto — Concessionario ufficiale KTM, Husqvarna, Kymco, Voge, Beta, Fantic, Piaggio. Moto nuove e usate.',
    keywords: [
      'concessionario moto',
      'KTM',
      'Husqvarna',
      'Kymco',
      'Voge',
      'Beta',
      'Fantic',
      'Piaggio',
      'moto nuove',
      'moto usate',
      'Avanzi Moto',
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
  themeColor: '#0A0A0A',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const brands = await client.fetch(allBrandsQuery)

  return (
    <html lang="it" className={`${barlowCondensed.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <Navbar brands={brands} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
