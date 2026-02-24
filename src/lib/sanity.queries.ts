import { groq } from 'next-sanity'

// ── Brands ──────────────────────────────────────────────
export const allBrandsQuery = groq`
  *[_type == "brand"] | order(order asc) {
    _id,
    name,
    slug,
    logo,
    order
  }
`

// Navbar/Footer: solo i marchi ufficiali con pagina dedicata
export const navBrandsQuery = groq`
  *[_type == "brand" && slug.current in ["ktm", "husqvarna", "voge", "kymco"]] | order(select(
    slug.current == "ktm" => 1,
    slug.current == "husqvarna" => 2,
    slug.current == "voge" => 3,
    slug.current == "kymco" => 4
  ) asc) {
    _id,
    name,
    slug,
    logo,
    order
  }
`

export const brandBySlugQuery = groq`
  *[_type == "brand" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    logo
  }
`

// ── Motorcycles ─────────────────────────────────────────
export const newMotorcyclesByBrandQuery = groq`
  // cache-bust: v2
  *[_type == "motorcycle" && condition == "nuova" && brand->slug.current == $brandSlug] | order(model asc) {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    cilindrata,
    shortDescription,
    images[] {
      asset { _ref },
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`

export const allNewMotorcyclesQuery = groq`
  // cache-bust: v2
  *[_type == "motorcycle" && condition == "nuova"] | order(model asc) {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    cilindrata,
    shortDescription,
    images[] {
      asset { _ref },
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`

export const allUsedMotorcyclesQuery = groq`
  // cache-bust: v2
  *[_type == "motorcycle" && condition == "usata"] | order(year desc) {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    kilometers,
    cilindrata,
    shortDescription,
    images[] {
      asset { _ref },
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`

export const motorcycleBySlugQuery = groq`
  *[_type == "motorcycle" && slug.current == $slug][0] {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    kilometers,
    cilindrata,
    shortDescription,
    longDescription,
    images[] {
      asset-> { _id, url, metadata { dimensions } },
      alt
    },
    brand-> {
      _id,
      name,
      slug,
      logo
    }
  }
`

export const allMotorcycleSlugsQuery = groq`
  *[_type == "motorcycle"] {
    slug,
    _updatedAt
  }
`

export const allBrandSlugsQuery = groq`
  *[_type == "brand" && slug.current in ["ktm", "husqvarna", "kymco", "voge"]] {
    slug,
    _updatedAt
  }
`

// ── Recommended: for NEW motos (same brand, prioritize same type) ──
export const recommendedNewQuery = groq`
  *[_type == "motorcycle" && slug.current != $currentSlug
    && brand->slug.current == $brandSlug]
  | order(select(type == $currentType => 0, 1) asc, _createdAt desc) [0...6] {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    cilindrata,
    images[0...1] {
      asset { _ref },
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`

// ── Recommended: for USED motos (other used bikes, prioritize same type) ──
export const recommendedUsedQuery = groq`
  *[_type == "motorcycle" && slug.current != $currentSlug
    && condition == "usata"]
  | order(select(type == $currentType => 0, 1) asc, _createdAt desc) [0...6] {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    cilindrata,
    images[0...1] {
      asset { _ref },
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`

// ── Homepage ────────────────────────────────────────────
export const homepageContentQuery = groq`
  *[_type == "homepageContent"][0] {
    heroImage {
      asset->,
      alt
    },
    heroTitle,
    heroSubtitle,
    featuredBlock1Title,
    featuredBlock1Description,
    featuredBlock1Image { asset->, alt },
    featuredBlock2Title,
    featuredBlock2Description,
    featuredBlock2Image { asset->, alt },
    featuredBlock3Title,
    featuredBlock3Description,
    featuredBlock3Image { asset->, alt },
    featuredBlock4Title,
    featuredBlock4Description,
    ctaTitle,
    ctaSubtitle
  }
`

// ── Site Settings ───────────────────────────────────────
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    siteName,
    description,
    phone,
    email,
    address,
    socialLinks
  }
`

// ── Featured / Latest bikes for homepage ────────────────
export const latestMotorcyclesQuery = groq`
  *[_type == "motorcycle" && condition == "nuova" && year == 2026 && brand->slug.current == "ktm"] | order(_createdAt desc) [0...20] {
    _id,
    model,
    slug,
    year,
    type,
    price,
    condition,
    images[0...1] {
      asset { _ref },
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`
