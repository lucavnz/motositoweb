/**
 * 🏍️ Sync Moto.it → Sanity
 *
 * Scrapes all used motorcycles from dealer.moto.it/avanzimoto/Usato
 * and syncs them with Sanity CMS.
 *
 * Usage:
 *   npx tsx scripts/sync-moto.ts              # Full sync
 *   npx tsx scripts/sync-moto.ts --dry-run    # Preview without writing
 */

import { createClient, type SanityClient } from '@sanity/client'
import * as cheerio from 'cheerio'

// ── Config ──────────────────────────────────────────────

const SANITY_PROJECT_ID = '9r9hyqn3'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const SANITY_TOKEN = process.env.SANITY_API_TOKEN as string;

const DEALER_BASE_URL = 'https://dealer.moto.it/avanzimoto/Usato'
const DETAIL_AJAX_URL = 'https://dealer.moto.it/avanzimoto/Detail/Detail'
const MAX_PAGES = 10 // Safety limit

const DRY_RUN = process.argv.includes('--dry-run')

// ── Types ───────────────────────────────────────────────

interface ScrapedMoto {
    productId: string
    brand: string
    model: string
    year: number | null
    price: number | null
    kilometers: number | null
    cilindrata: number | null
    shortDescription: string
    images: string[] // CDN URLs (high-res 1000x750)
}

interface SanityMoto {
    _id: string
    model: string
    motoItProductId: string | null
    price: number | null
    kilometers: number | null
    cilindrata: number | null
    shortDescription: string
    images: Array<{ _key: string; asset: { _ref: string } }> | null
    brand: { _id: string; name: string } | null
}

interface SanityBrand {
    _id: string
    name: string
    slug: { current: string }
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

function parsePrice(text: string): number | null {
    // "€ 5.690" → 5690, "5.690" → 5690
    const cleaned = text.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
}

function parseKm(text: string): number | null {
    // "8.723" → 8723, "57.871 km" → 57871
    const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : Math.round(num)
}

function parseCilindrata(text: string): number | null {
    // "471 cc" → 471, "1.301 cc" → 1301
    const cleaned = text.replace(/\s*cc\s*/i, '').replace(/\./g, '').trim()
    const num = parseInt(cleaned, 10)
    return isNaN(num) ? null : num
}

function parseYear(text: string): number | null {
    const match = text.match(/\b(19|20)\d{2}\b/)
    return match ? parseInt(match[0], 10) : null
}

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
}

/** Fetch HTML with retry */
async function fetchHTML(url: string, extraHeaders?: Record<string, string>, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers: { ...FETCH_HEADERS, ...extraHeaders } })
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

/** Discover all product IDs from paginated listing pages */
async function discoverProductIds(): Promise<string[]> {
    const productIds: string[] = []

    for (let page = 1; page <= MAX_PAGES; page++) {
        const url = page === 1 ? DEALER_BASE_URL : `${DEALER_BASE_URL}/pagina-${page}`
        console.log(`📄 Fetching listing page ${page}: ${url}`)

        let html: string
        try {
            html = await fetchHTML(url)
        } catch {
            console.log(`  ⚠️  Page ${page} failed to load, stopping pagination`)
            break
        }

        const $ = cheerio.load(html)
        const idsOnPage: string[] = []

        // Extract product IDs from data-target="#annuncio_XXXX" attributes
        $('[data-target]').each((_, el) => {
            const target = $(el).attr('data-target') || ''
            const match = target.match(/annuncio_(\d+)/)
            if (match) idsOnPage.push(match[1])
        })

        // Deduplicate IDs on this page
        const uniqueIds = [...new Set(idsOnPage)]
        console.log(`  ✅ Found ${uniqueIds.length} motorcycles on page ${page}`)

        if (uniqueIds.length === 0) {
            console.log(`  ⛔ No motorcycles found, stopping pagination`)
            break
        }

        productIds.push(...uniqueIds)
        await sleep(800)
    }

    return [...new Set(productIds)]
}

/** Scrape full details via the AJAX detail endpoint */
async function scrapeMotorcycleDetails(productId: string): Promise<ScrapedMoto | null> {
    const url = `${DETAIL_AJAX_URL}?ID=${productId}`

    try {
        const html = await fetchHTML(url, { 'X-Requested-With': 'XMLHttpRequest' })
        const $ = cheerio.load(html)

        // ── Brand & Model ──
        // From print header: <h1>Honda</h1> <h2>CB 500 X (2021)</h2>
        const brand = $('.dlr-modal__print__header__title').first().text().trim()
        let model = $('.dlr-modal__print__header__subtitle').first().text().trim()

        // Fallback: from modal header title "Honda CB 500 X (2021)"
        if (!brand && !model) {
            const headerTitle = $('.dlr-modal__header__title').text().trim()
            if (headerTitle) {
                const parts = headerTitle.match(/^(\S+)\s+(.+)$/)
                if (parts) {
                    // brand = parts[1] — but this won't work for multi-word brands
                }
            }
        }

        if (!brand) {
            console.log(`  ⚠️  Could not extract brand for product ${productId}`)
            return null
        }

        // Clean model: remove year range like "(2021)" or "(2017 - 20)"
        const cleanModel = model.replace(/\s*\(\d{4}(\s*-\s*\d{2,4})?\)\s*$/, '').trim()

        // ── Year ── extract from model text e.g. "(2021)"
        let year = parseYear(model)

        // ── Specs from table ──
        let price: number | null = null
        let kilometers: number | null = null
        let cilindrata: number | null = null

        $('.dlr-modal__specs__table tr').each((_, row) => {
            const label = $(row).find('th.spec-label').text().trim().toLowerCase()
            const valueTd = $(row).find('td')
            const value = valueTd.text().trim()

            if (label.includes('prezzo')) {
                // Price is inside <span itemprop="price">5.690</span>
                const priceSpan = valueTd.find('[itemprop="price"]').text().trim()
                price = parsePrice(priceSpan || value)
            } else if (label === 'km') {
                kilometers = parseKm(value)
            } else if (label.includes('cilindrata')) {
                cilindrata = parseCilindrata(value)
            } else if (label.includes('anno') && !year) {
                year = parseYear(value)
            }
        })

        // ── Description ──
        const shortDescription = $('.dlr-modal__description__content')
            .text()
            .trim()
            .substring(0, 500)

        // ── Images from JS variable ──
        // Pattern: var annuncio_9548041 = [{href: "...", ...}]
        const images: string[] = []
        const jsPattern = new RegExp(`var\\s+annuncio_${productId}\\s*=\\s*(\\[.*?\\])`, 's')
        const jsMatch = html.match(jsPattern)
        if (jsMatch) {
            try {
                const imgArray = JSON.parse(jsMatch[1]) as Array<{ href: string }>
                for (const img of imgArray) {
                    if (img.href && img.href.includes('cdn-img.stcrm.it')) {
                        images.push(img.href)
                    }
                }
            } catch {
                console.log(`  ⚠️  Could not parse image JSON for product ${productId}`)
            }
        }

        // Fallback: find images from print header or img tags
        if (images.length === 0) {
            $('img[src*="cdn-img.stcrm.it"]').each((_, el) => {
                const src = $(el).attr('src') || ''
                if (src) {
                    const highRes = src.replace(/\/HOR_STD\/\d+x\//, '/1000x750/')
                    images.push(highRes)
                }
            })
        }

        // Deduplicate
        const uniqueImages = [...new Set(images)]

        return {
            productId,
            brand: brand.trim(),
            model: cleanModel,
            year,
            price,
            kilometers,
            cilindrata,
            shortDescription,
            images: uniqueImages,
        }
    } catch (err) {
        console.error(`  ❌ Error scraping product ${productId}:`, err)
        return null
    }
}

// ── Sanity Operations ───────────────────────────────────

async function fetchExistingMotos(): Promise<SanityMoto[]> {
    return sanityClient.fetch(`*[_type == "motorcycle" && condition == "usata"] {
    _id, model, motoItProductId, price, kilometers, cilindrata, shortDescription,
    images[] { _key, asset { _ref } },
    brand-> { _id, name }
  }`)
}

async function fetchExistingBrands(): Promise<SanityBrand[]> {
    return sanityClient.fetch(`*[_type == "brand"] { _id, name, slug }`)
}

async function uploadImageFromUrl(imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://dealer.moto.it/' },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        const asset = await sanityClient.assets.upload('image', buffer, {
            filename: `moto-${Date.now()}.jpg`,
            contentType: 'image/jpeg',
        })
        return asset._id
    } catch (err) {
        console.error(`  ❌ Failed to upload image ${imageUrl}:`, err)
        return null
    }
}

async function ensureBrand(brandName: string, existingBrands: SanityBrand[]): Promise<string> {
    const normalizedName = brandName.toUpperCase()
    const existing = existingBrands.find((b) => b.name.toUpperCase() === normalizedName)
    if (existing) return existing._id

    const slug = slugify(normalizedName)
    console.log(`  🏷️  Creating new brand: ${normalizedName} (slug: ${slug})`)

    if (DRY_RUN) {
        const fakeId = `brand-${slug}`
        existingBrands.push({ _id: fakeId, name: normalizedName, slug: { current: slug } })
        return fakeId
    }

    const created = await sanityClient.create({
        _type: 'brand' as const,
        name: normalizedName,
        slug: { _type: 'slug' as const, current: slug },
    })
    existingBrands.push({ _id: created._id, name: normalizedName, slug: { current: slug } })
    return created._id
}

function hasChanges(existing: SanityMoto, scraped: ScrapedMoto): boolean {
    if (existing.price !== scraped.price) return true
    if (existing.kilometers !== scraped.kilometers) return true
    if (existing.cilindrata !== scraped.cilindrata) return true
    if ((existing.shortDescription || '') !== (scraped.shortDescription || '')) return true
    const existingImageCount = existing.images?.length || 0
    if (existingImageCount !== scraped.images.length) return true
    return false
}

async function createMotorcycle(scraped: ScrapedMoto, brandId: string): Promise<void> {
    console.log(`  ➕ Creating: ${scraped.brand} ${scraped.model} (ID: ${scraped.productId})`)
    if (DRY_RUN) return

    // Upload images
    const imageAssets: Array<{ _key: string; _type: string; alt: string; asset: { _type: string; _ref: string } }> = []
    for (let i = 0; i < scraped.images.length; i++) {
        const assetId = await uploadImageFromUrl(scraped.images[i])
        if (assetId) {
            imageAssets.push({
                _key: `img${i}`,
                _type: 'image',
                alt: `${scraped.brand} ${scraped.model}`,
                asset: { _type: 'reference', _ref: assetId },
            })
        }
        await sleep(300)
    }

    const slug = slugify(`${scraped.brand}-${scraped.model}-${scraped.productId}`)

    await sanityClient.create({
        _type: 'motorcycle' as const,
        model: scraped.model,
        slug: { _type: 'slug' as const, current: slug },
        brand: { _type: 'reference' as const, _ref: brandId },
        year: scraped.year || new Date().getFullYear(),
        type: 'strada' as const,
        condition: 'usata' as const,
        price: scraped.price,
        kilometers: scraped.kilometers,
        cilindrata: scraped.cilindrata,
        shortDescription: scraped.shortDescription || '',
        motoItProductId: scraped.productId,
        images: imageAssets,
    })
}

async function updateMotorcycle(existingId: string, scraped: ScrapedMoto, existingMoto: SanityMoto): Promise<void> {
    console.log(`  ✏️  Updating: ${scraped.brand} ${scraped.model} (ID: ${scraped.productId})`)
    if (DRY_RUN) return

    const patch: Record<string, unknown> = {}
    if (existingMoto.price !== scraped.price) patch.price = scraped.price
    if (existingMoto.kilometers !== scraped.kilometers) patch.kilometers = scraped.kilometers
    if (existingMoto.cilindrata !== scraped.cilindrata) patch.cilindrata = scraped.cilindrata
    if ((existingMoto.shortDescription || '') !== (scraped.shortDescription || '')) {
        patch.shortDescription = scraped.shortDescription
    }

    // Re-upload images if count changed
    const existingImageCount = existingMoto.images?.length || 0
    if (existingImageCount !== scraped.images.length) {
        const imageAssets: Array<{ _key: string; _type: string; alt: string; asset: { _type: string; _ref: string } }> = []
        for (let i = 0; i < scraped.images.length; i++) {
            const assetId = await uploadImageFromUrl(scraped.images[i])
            if (assetId) {
                imageAssets.push({
                    _key: `img${i}`,
                    _type: 'image',
                    alt: `${scraped.brand} ${scraped.model}`,
                    asset: { _type: 'reference', _ref: assetId },
                })
            }
            await sleep(300)
        }
        if (imageAssets.length > 0) patch.images = imageAssets
    }

    if (Object.keys(patch).length > 0) {
        await sanityClient.patch(existingId).set(patch).commit()
    }
}

// ── Main ────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════')
    console.log('🏍️  Moto.it → Sanity Sync')
    console.log(`📋 Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🚀 LIVE SYNC'}`)
    console.log('═══════════════════════════════════════════════════════')
    console.log()

    // Step 1: Discover all product IDs from listing pages
    console.log('📡 Step 1: Discovering all motorcycle listings...')
    const productIds = await discoverProductIds()
    console.log(`\n✅ Found ${productIds.length} total motorcycles to process\n`)

    if (productIds.length === 0) {
        console.log('❌ No motorcycles found! Check the website structure.')
        return
    }

    // Step 2: Scrape full details via AJAX endpoint
    console.log('🔍 Step 2: Scraping details via AJAX detail endpoint...')
    const scrapedMotos: ScrapedMoto[] = []

    for (let i = 0; i < productIds.length; i++) {
        const id = productIds[i]
        console.log(`  [${i + 1}/${productIds.length}] Scraping product ${id}...`)

        const moto = await scrapeMotorcycleDetails(id)
        if (moto) {
            scrapedMotos.push(moto)
            console.log(`    ✅ ${moto.brand} ${moto.model} | ${moto.year || '?'} | €${moto.price || '?'} | ${moto.kilometers || '?'}km | ${moto.cilindrata || '?'}cc | ${moto.images.length} imgs`)
        }

        await sleep(600) // Polite delay between AJAX calls
    }

    console.log(`\n✅ Successfully scraped ${scrapedMotos.length}/${productIds.length} motorcycles\n`)

    // Step 3: Fetch existing data from Sanity
    console.log('📦 Step 3: Fetching existing data from Sanity...')
    const existingMotos = await fetchExistingMotos()
    const existingBrands = await fetchExistingBrands()
    console.log(`  📊 Found ${existingMotos.length} existing used motos in Sanity`)
    console.log(`  🏷️  Found ${existingBrands.length} existing brands in Sanity`)
    console.log()

    // Build lookup by motoItProductId
    const existingByProductId = new Map<string, SanityMoto>()
    for (const moto of existingMotos) {
        if (moto.motoItProductId) {
            existingByProductId.set(moto.motoItProductId, moto)
        }
    }

    // Step 4: Sync
    console.log('🔄 Step 4: Syncing with Sanity...')
    let created = 0, updated = 0, skipped = 0

    for (const scraped of scrapedMotos) {
        const brandId = await ensureBrand(scraped.brand, existingBrands)
        const existing = existingByProductId.get(scraped.productId)

        if (!existing) {
            await createMotorcycle(scraped, brandId)
            created++
        } else if (hasChanges(existing, scraped)) {
            await updateMotorcycle(existing._id, scraped, existing)
            updated++
        } else {
            console.log(`  ⏭️  Skipping (unchanged): ${scraped.brand} ${scraped.model}`)
            skipped++
        }

        await sleep(500)
    }

    // Summary
    console.log()
    console.log('═══════════════════════════════════════════════════════')
    console.log('📊 Sync Summary:')
    console.log(`  ➕ Created: ${created}`)
    console.log(`  ✏️  Updated: ${updated}`)
    console.log(`  ⏭️  Skipped: ${skipped}`)
    console.log(`  ❌ Failed: ${productIds.length - scrapedMotos.length}`)
    console.log(`  🏷️  Brands: ${existingBrands.length} total`)
    if (DRY_RUN) {
        console.log('  🔍 This was a DRY RUN — no changes were made')
    }
    console.log('═══════════════════════════════════════════════════════')
}

main().catch((err) => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
})
