import Link from 'next/link'
import Image from 'next/image'
import { client } from '@/lib/sanity.client'
import { siteSettingsQuery, navBrandsQuery } from '@/lib/sanity.queries'

export async function Footer() {
    const [settings, brands] = await Promise.all([
        client.fetch(siteSettingsQuery),
        client.fetch(navBrandsQuery),
    ])

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-col brand-col">
                    <Link href="/" className="footer-logo" style={{ display: 'inline-block', marginBottom: '20px' }}>
                        <Image
                            src="/AvanzimotoLOGO.webp"
                            alt="Avanzi Moto Logo"
                            width={250}
                            height={50}
                            style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
                        />
                    </Link>
                    <p className="footer-desc">
                        Concessionario ufficiale multimarca. KTM, Husqvarna, Kymco, Voge,
                        Beta, Fantic, Piaggio. Vendita moto nuove e usate.
                    </p>
                    <div className="footer-socials">
                        {settings?.socialLinks?.map(
                            (social: { platform: string; url: string }, i: number) => (
                                <a
                                    key={i}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {social.platform}
                                </a>
                            )
                        )}
                    </div>
                </div>

                <div className="footer-col">
                    <h4 className="footer-heading">Marchi</h4>
                    <ul className="footer-link-list">
                        {brands?.map((brand: { _id: string; name: string; slug: { current: string } }) => (
                            <li key={brand._id}>
                                <Link href={`/marchi/${brand.slug.current}`}>
                                    {brand.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="footer-col">
                    <h4 className="footer-heading">Esplora</h4>
                    <ul className="footer-link-list">
                        <li>
                            <Link href="/">
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link href="/usato">
                                Usato
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="footer-col contact-col">
                    <h4 className="footer-heading">Contatti</h4>
                    <div className="footer-contact-info">
                        {settings?.address && (
                            <div className="contact-item">
                                <p>{settings.address}</p>
                            </div>
                        )}
                        {settings?.phone && (
                            <div className="contact-item">
                                <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                            </div>
                        )}
                        {settings?.email && (
                            <div className="contact-item">
                                <a href={`mailto:${settings.email}`}>{settings.email}</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="footer-bottom-inner">
                    <span>© {new Date().getFullYear()} Avanzi Moto. Tutti i diritti riservati.</span>
                    <span className="footer-tech">P.IVA / C.F. {settings?.vatNumber || 'TBD'}</span>
                </div>
            </div>
        </footer>
    )
}
