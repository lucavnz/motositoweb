import Link from 'next/link'
import { client } from '@/lib/sanity.client'
import { siteSettingsQuery, allBrandsQuery } from '@/lib/sanity.queries'

export async function Footer() {
    const [settings, brands] = await Promise.all([
        client.fetch(siteSettingsQuery),
        client.fetch(allBrandsQuery),
    ])

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div>
                    <div className="footer-brand">
                        AVANZI <span className="logo-accent">MOTO</span>
                    </div>
                    <p className="footer-desc">
                        Concessionario ufficiale multimarca. KTM, Husqvarna, Kymco, Voge,
                        Beta, Fantic, Piaggio. Vendita moto nuove e usate.
                    </p>
                </div>

                <div>
                    <h4 className="footer-heading">Marchi</h4>
                    <ul className="footer-link-list">
                        {brands?.map((brand: { _id: string; name: string; slug: { current: string } }) => (
                            <li key={brand._id}>
                                <Link href={`/marchi/${brand.slug.current}`}>{brand.name}</Link>
                            </li>
                        ))}
                        <li>
                            <Link href="/usato" style={{ color: 'var(--orange)' }}>
                                Usato
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="footer-contact">
                    <h4 className="footer-heading">Contatti</h4>
                    {settings?.address && <p>{settings.address}</p>}
                    {settings?.phone && (
                        <p>
                            <a href={`tel:${settings.phone}`}>{settings.phone}</a>
                        </p>
                    )}
                    {settings?.email && (
                        <p>
                            <a href={`mailto:${settings.email}`}>{settings.email}</a>
                        </p>
                    )}
                </div>
            </div>

            <div className="footer-bottom">
                <span>© {new Date().getFullYear()} Avanzi Moto. Tutti i diritti riservati.</span>
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
        </footer>
    )
}
