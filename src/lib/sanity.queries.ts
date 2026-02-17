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
  *[_type == "motorcycle" && condition == "nuova" && brand->slug.current == $brandSlug] | order(model asc) {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    shortDescription,
    images[] {
      asset->,
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
  *[_type == "motorcycle" && condition == "usata"] | order(year desc) {
    _id,
    model,
    slug,
    year,
    type,
    condition,
    price,
    kilometers,
    shortDescription,
    images[] {
      asset->,
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
    shortDescription,
    longDescription,
    images[] {
      asset->,
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
    slug
  }
`

export const allBrandSlugsQuery = groq`
  *[_type == "brand"] {
    slug
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
    featuredBlock4Image { asset->, alt },
    ctaTitle,
    ctaSubtitle,
    ctaImage {
      asset->,
      alt
    }
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
  *[_type == "motorcycle" && condition == "nuova"] | order(_createdAt desc) [0...6] {
    _id,
    model,
    slug,
    year,
    type,
    price,
    images[] {
      asset->,
      alt
    },
    brand-> {
      _id,
      name,
      slug
    }
  }
`
