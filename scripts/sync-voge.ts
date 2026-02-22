/**
 * 🟡 Sync Voge → Sanity
 *
 * Scrapes all motorcycles from https://vogeitaly.it/
 * and syncs them with Sanity CMS.
 *
 * Usage:
 *   npx tsx scripts/sync-voge.ts              # Full sync
 *   npx tsx scripts/sync-voge.ts --dry-run    # Preview without writing
 */

import { createClient, type SanityClient } from '@sanity/client'
import * as cheerio from 'cheerio'

// ── Config ──────────────────────────────────────────────

const SANITY_PROJECT_ID = '9r9hyqn3'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const SANITY_TOKEN = process.env.SANITY_API_TOKEN as string;

const VOGE_BASE_URL = 'https://vogeitaly.it'

const DRY_RUN = process.argv.includes('--dry-run')

// ── Types ───────────────────────────────────────────────

interface ScrapedBike {
    category: string
    model: string
    year: number | null
    price: number | null
    cilindrata: number | null
    shortDescription: string
    images: string[]
    url: string
}

// ── Sanity Client ───────────────────────────────────────

const sanityClient: SanityClient = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: SANITY_TOKEN,
    useCdn: false,
})

// ── Helpers ─────────────────────────────────────────────

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ñ]/g, 'n')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
}

async function fetchHTML(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers: FETCH_HEADERS })
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
            return await res.text()
        } catch (err) {
            if (i === retries - 1) throw err
            console.log(`  ⚠️  Retry ${i + 1}/${retries} for ${url}`)
            await sleep(2000 * (i + 1))
        }
    }
    throw new Error('Unreachable')
}

// ── Scraping ────────────────────────────────────────────

async function discoverModels(): Promise<{ url: string, type: string }[]> {
    console.log(`📄 Fetching ALL Voge models via WordPress API...`)

    // Use WordPress REST API to get ALL published pages — no model can be missed
    const apiUrl = `${VOGE_BASE_URL}/wp-json/wp/v2/pages?per_page=100&_fields=id,link,slug,title`
    const res = await fetch(apiUrl)
    const pages: { id: number, link: string, slug: string, title: { rendered: string } }[] = await res.json()

    // Blacklist non-product pages (about, accessori, etc.)
    const blacklistSlugs = [
        'accessori', 'care', 'coming-soon', 'social', 'loncin',
        'informativa-clienti-e-fornitori', 'privacy-policy',
        'vuoidiventarerivenditore', 'eicma2024', 'sample-page',
        'concessionari', 'promozioni', 'chi-siamo', 'contatti',
        'news', 'faq', 'garanzia', 'promo', 'di-nuovo',
        'areastampa', 'cookie-policy', 'informativa-al-trattamento-dei-dati',
        'promo-news',
    ]

    const models: { url: string, type: string }[] = []

    for (const page of pages) {
        const slug = page.slug.toLowerCase()
        const link = page.link

        // Skip blacklisted slugs
        if (blacklistSlugs.includes(slug)) continue
        // Skip the homepage
        if (slug === '' || link === VOGE_BASE_URL + '/') continue

        // Determine type from model family
        let type = 'strada'
        if (slug.includes('sfida')) type = 'scooter'
        else if (slug.includes('xwolf')) type = 'quad'
        // Brivido, Trofeo, Valico → strada

        models.push({ url: link, type })
        console.log(`  Found: ${page.title.rendered} → ${link} [${type}]`)
    }

    console.log(`Found ${models.length} unique bike models to inspect.`)
    return models
}

async function scrapeBikeDetails(bikeMeta: { url: string, type: string }): Promise<ScrapedBike | null> {
    const { url, type } = bikeMeta
    try {
        const html = await fetchHTML(url)
        const $ = cheerio.load(html)

        // 1. Model Name
        let h1 = $('h1').first().text().trim() || $('h2.vc_custom_heading').first().text().trim()

        if (!h1) {
            // fallback to title
            h1 = $('title').text().split('–')[0].trim()
        }

        let model = h1.replace('VOGE', '').trim()
        const year = new Date().getFullYear() // Voge rarely posts the year in title, default to current

        // 2. Price
        let price: number | null = null
        // Case A: Promozione exists
        const promoText = $('.promo-price').text().trim()
        if (promoText) {
            price = parseFloat(promoText.replace(/[^\d,]/g, '').replace(',', '.'))
        }
        // Case B: Listino table or <p><strong>
        if (!price) {
            $('td').each((_, el) => {
                const text = $(el).text().trim().toLowerCase()
                if (text.includes('prezzo di listino') || text.includes('prezzo')) {
                    const priceNode = $(el).next('td, th')
                    if (priceNode.length > 0) {
                        const pt = priceNode.text().trim()
                        const val = parseFloat(pt.replace(/[^\d,]/g, '').replace(',', '.'))
                        if (val > 500 && val < 50000) price = val
                    }
                }
            })
        }

        // Case C: Paragraph with strong tag (Prezzo di Listino € 5.990)
        if (!price) {
            $('p strong, p > span > strong, h2, h3, h4').each((_, el) => {
                const text = $(el).text().trim()
                if (text.includes('€') && (text.toLowerCase().includes('prezzo') || text.toLowerCase().includes('listino'))) {
                    const match = text.match(/[\d]{1,3}(?:[.,][\d]{3})*(?:[.,][\d]{2})?/)
                    if (match) {
                        const cleanPriceStr = match[0].replace('.', '').replace(',', '.')
                        const val = parseFloat(cleanPriceStr)
                        if (val > 500 && val < 50000) price = val
                    }
                }
            })
        }

        // 3. Displacement
        let cilindrata: number | null = null
        $('td').each((_, el) => {
            const label = $(el).text().trim().toLowerCase()
            if (label === 'cilindrata' || label.includes('cilindrata')) {
                // Next cell usually contains value
                const valNode = $(el).next('td')
                if (valNode.length > 0) {
                    const val = valNode.text().trim()
                    const match = val.match(/([\d.]+)/)
                    if (match) cilindrata = Math.round(parseFloat(match[1]))
                }
            }
        })

        // 4. Description
        let description = ''
        const potentialParagraphs = $('.wpb_wrapper p').filter((_, el) => {
            const text = $(el).text().trim()
            return text.length > 30 && !text.includes('Prezzo') && !text.includes('€') && !text.includes('Listino')
        })
        if (potentialParagraphs.length > 0) {
            description = potentialParagraphs.first().text().trim()
        }

        // 5. Images - STRICT LOGIC for VOGE
        // Accept only .jpg files from data-bg, src, href. REJECT .png.
        const validImages: string[] = []

        const checkImg = (imgUrl: string | undefined, isHero: boolean = false) => {
            if (!imgUrl) return
            if (!imgUrl.startsWith('http')) return
            const lowerUrl = imgUrl.toLowerCase()

            // STRICT REJECT: PNG (Studio images) and icons
            if (lowerUrl.includes('.png')) return
            if (lowerUrl.includes('logo')) return
            if (lowerUrl.includes('icon')) return

            // ACCEPT: JPG
            if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
                if (isHero) validImages.unshift(imgUrl)
                else validImages.push(imgUrl)
            }
        }

        // ============================================================
        // WHITELIST-ONLY IMAGE EXTRACTION
        // We ONLY accept images from two verified sources:
        //   1) The first Slider Revolution hero (img.rev-slidebg)
        //   2) The bottom gallery (img.vc_single_image-img whose
        //      parent <a> href points to a .jpg/.jpeg file)
        // Everything else (Instagram, team images, related product
        // thumbnails, logos, PNGs) is simply never picked up.
        // ============================================================

        // SOURCE 1: Hero image from the first Slider Revolution
        const heroImg = $('img.rev-slidebg').first()
        if (heroImg.length) {
            const heroSrc = heroImg.attr('src')
            checkImg(heroSrc, true)
        }

        // SOURCE 2: Gallery images — ONLY img.vc_single_image-img
        // whose closest <a> parent links directly to a .jpg/.jpeg
        // (NOT to a page URL like /sfida-sr1-adv — those are
        // "related products" thumbnails showing OTHER bikes)
        const countBeforeGallery = validImages.length
        $('img.vc_single_image-img').each((_, el) => {
            const parentHref = $(el).closest('a').attr('href') || ''

            // ONLY accept if parent <a> points to an actual image file
            if (!parentHref.match(/\.(jpg|jpeg)$/i)) return

            // Reject studio/estudio photos
            if (parentHref.toLowerCase().includes('estudio')) return

            checkImg(parentHref) // use the higher-res parent link
        })

        // SOURCE 3 (FALLBACK): If no vc_single_image gallery images were added,
        // some pages (Brivido 625R, Trofeo 300AC, X Wolf) use mkdf-ig-lightbox
        // as their product gallery. Only use this if SOURCE 2 yielded nothing.
        const galleryAdded = validImages.length - countBeforeGallery
        if (galleryAdded === 0) {
            $('a.mkdf-ig-lightbox img, .mkdf-ig-lightbox img').each((_, el) => {
                const parentHref = $(el).closest('a').attr('href') || ''
                if (!parentHref.match(/\.(jpg|jpeg)$/i)) return
                if (parentHref.toLowerCase().includes('estudio')) return
                checkImg(parentHref)
            })
        }

        const uniqueImages = [...new Set(validImages)].slice(0, 4)

        if (!model) return null

        if (uniqueImages.length === 0) {
            console.log(`  ⏭️  Skipping ${model}: no valid .jpg images found`)
            return null
        }

        return {
            category: type,
            model,
            year: year,
            price,
            cilindrata,
            shortDescription: description,
            images: uniqueImages,
            url
        }

    } catch (err) {
        console.error(`  ❌ Failed to scraped ${url}:`, err)
        return null
    }
}

// ── Sanity Sync Logic ───────────────────────────────────

async function uploadImageFromUrl(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, { headers: FETCH_HEADERS })
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${imageUrl}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        const asset = await sanityClient.assets.upload('image', buffer, {
            filename: `voge-${Date.now()}.jpg`,
        })
        return asset._id
    } catch (err) {
        console.error(`  ❌ Failed image upload: ${imageUrl}`, (err as Error).message)
        return null
    }
}

async function ensureBrandVoge(): Promise<string> {
    const brandName = 'VOGE'
    const existing = await sanityClient.fetch(`*[_type == "brand" && name match "VOGE"][0]`)
    if (existing) return existing._id

    if (DRY_RUN) return 'fake-voge-id'

    const created = await sanityClient.create({
        _type: 'brand',
        name: brandName,
        slug: { _type: 'slug', current: 'voge' }
    })
    return created._id
}

async function processBike(bike: ScrapedBike, brandId: string) {
    if (!bike.model) return

    // Find by Model Name and Brand
    const matches = await sanityClient.fetch(
        `*[_type == "motorcycle" && references($brandId) && model == $model && condition == "nuova"]`,
        { brandId, model: bike.model }
    )

    const existing = matches[0]

    if (existing) {
        console.log(`  Found existing ${bike.model}. Checking for updates...`)
        const patch: any = {}
        if (bike.price && existing.price !== bike.price) patch.price = bike.price
        if (bike.cilindrata && !existing.cilindrata) patch.cilindrata = bike.cilindrata

        if (Object.keys(patch).length > 0 && !DRY_RUN) {
            await sanityClient.patch(existing._id).set(patch).commit()
            console.log(`    ✏️ Updated ${bike.model}:`, patch)
        } else {
            console.log(`    👌 No updates needed`)
        }
    } else {
        console.log(`  🆕 Creating new bike: ${bike.model} (${bike.year}) => Price: ${bike.price}, CC: ${bike.cilindrata}`)
        console.log(`     Images: ${bike.images.length} found`)

        if (DRY_RUN) return

        const imageAssets = []
        for (const imgUrl of bike.images) {
            const assetId = await uploadImageFromUrl(imgUrl)
            if (assetId) {
                imageAssets.push({
                    _key: Math.random().toString(36).substring(7),
                    _type: 'image',
                    asset: { _type: 'reference', _ref: assetId }
                })
            }
        }

        const doc = {
            _type: 'motorcycle',
            model: bike.model,
            slug: { _type: 'slug', current: slugify(`voge-${bike.model}-${bike.year}`) },
            brand: { _type: 'reference', _ref: brandId },
            year: bike.year,
            type: bike.category,
            condition: 'nuova',
            price: bike.price,
            cilindrata: bike.cilindrata,
            shortDescription: bike.shortDescription,
            images: imageAssets
        }

        await sanityClient.create(doc)
    }
}

// ── Main ────────────────────────────────────────────────

async function main() {
    console.log('🟡 Starting Voge Sync...')

    const bikesMeta = await discoverModels()
    console.log(`Found ${bikesMeta.length} unique bike models to inspect.`)

    const brandId = await ensureBrandVoge()

    for (const meta of bikesMeta) {
        console.log(`Processing ${meta.url}...`)
        const data = await scrapeBikeDetails(meta)
        if (data) {
            await processBike(data, brandId)
        }
        await sleep(1500)
    }

    console.log('Done.')
}

main().catch(console.error)
