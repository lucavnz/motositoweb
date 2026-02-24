import Link from 'next/link'
import Image from 'next/image'

interface SiteSettings {
    siteName?: string
    description?: string
    phone?: string
    email?: string
    address?: string
    vatNumber?: string
    socialLinks?: Array<{ platform: string; url: string }>
}

interface Brand {
    _id: string
    name: string
    slug: { current: string }
}

export function Footer({
    settings,
    brands,
}: {
    settings: SiteSettings | null
    brands: Brand[] | null
}) {
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
                            (social, i) => (
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
                    <ul className="footer-link-list">
                        {brands?.map((brand) => (
                            <li key={brand._id}>
                                <Link href={`/marchi/${brand.slug.current}`}>
                                    {brand.name.toUpperCase()}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="footer-col">
                    <ul className="footer-link-list">
                        <li>
                            <Link href="/usato">
                                USATO
                            </Link>
                        </li>
                        <li>
                            <Link href="/contattaci">
                                CONTATTACI
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="footer-col contact-col">
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
