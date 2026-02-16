'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Brand {
    _id: string
    name: string
    slug: { current: string }
}

export function Navbar({ brands }: { brands: Brand[] }) {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <>
            <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
                <Link href="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center' }}>
                    <Image
                        src="/AvanzimotoLOGO.webp"
                        alt="Avanzi Moto Logo"
                        width={250}
                        height={50}
                        priority
                        style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
                    />
                </Link>

                <ul className="navbar-center">
                    {brands?.map((brand) => (
                        <li key={brand._id}>
                            <Link
                                href={`/marchi/${brand.slug.current}`}
                                className={
                                    pathname === `/marchi/${brand.slug.current}` ? 'active' : ''
                                }
                            >
                                {brand.name}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="navbar-right">
                    <Link href="/usato" className="navbar-usato-btn">
                        USATO
                    </Link>
                </div>

                <button
                    className={`hamburger ${mobileOpen ? 'hamburger--open' : ''}`}
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Menu"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </nav>

            <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
                <Link href="/" onClick={() => setMobileOpen(false)}>
                    Home
                </Link>
                {brands?.map((brand) => (
                    <Link
                        key={brand._id}
                        href={`/marchi/${brand.slug.current}`}
                        onClick={() => setMobileOpen(false)}
                    >
                        {brand.name}
                    </Link>
                ))}
                <Link
                    href="/usato"
                    onClick={() => setMobileOpen(false)}
                    className="mobile-menu-usato"
                >
                    Usato
                </Link>
            </div>
        </>
    )
}
