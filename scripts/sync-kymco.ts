/**
 * 🟡 Sync KYMCO Scooters → Sanity
 *
 * Scrapes all scooters from https://kymco.it/prodotti_categorie/scooter/
 * and syncs them with Sanity CMS.
 * 
 * IMPORTANT: Only uploads scooters that have non-studio images.
 * Studio images (from /media/schede/imm/) are NEVER uploaded.
 *
 * Usage:
 *   npx tsx scripts/sync-kymco.ts              # Full sync
 *   npx tsx scripts/sync-kymco.ts --dry-run    # Preview without writing
 */

import { createClient, type SanityClient } from '@sanity/client'
import * as cheerio from 'cheerio'

// ── Config ──────────────────────────────────────────────

const SANITY_PROJECT_ID = '9r9hyqn3'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const SANITY_TOKEN = process.env.SANITY_API_TOKEN as string;

const KYMCO_BASE_URL = 'https://kymco.it'

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

/**
 * Scrape the KYMCO scooter category page to get all model URLs.
 * Links follow the pattern: /Prodotti/_CODE (uppercase, with underscore prefix)
 */
async function discoverModels(): Promise<{ url: string }[]> {
    console.log(`📄 Fetching KYMCO scooter category page...`)
    const html = await fetchHTML(`${KYMCO_BASE_URL}/prodotti_categorie/scooter/`)
    const $ = cheerio.load(html)

    const models: { url: string }[] = []
    const seen = new Set<string>()

    $('a').each((_, el) => {
        const href = $(el).attr('href')
        if (!href) return

        // Match product links with underscore prefix (main pages)
        // Pattern: /Prodotti/_CODE or full URL
        const fullUrl = href.startsWith('http') ? href : `${KYMCO_BASE_URL}${href}`

        // Only take underscore-prefixed product links (these are the actual detail pages)
        if (!fullUrl.match(/kymco\.it\/Prodotti\/_/i)) return

        // Normalize: trim trailing slash
        const normalized = fullUrl.replace(/\/$/, '')

        if (!seen.has(normalized)) {
            seen.add(normalized)
            models.push({ url: normalized })
        }
    })

    return models
}

import { Jimp } from 'jimp'

// Helper to determine if an image has a white studio background
// Checks top-left and top-right pixels
async function isStudioImage(url: string): Promise<boolean> {
    try {
        const image = await Jimp.read(url)
        if (!image) return true // assume studio on error

        const width = image.bitmap.width
        // Sample top-left and top-right pixels (slightly inset to avoid borders)
        const tlColor = image.getPixelColor(10, 10)
        const trColor = image.getPixelColor(width - 10, 10)

        const tl_r = (tlColor >> 24) & 255
        const tl_g = (tlColor >> 16) & 255
        const tl_b = (tlColor >> 8) & 255

        const tr_r = (trColor >> 24) & 255
        const tr_g = (trColor >> 16) & 255
        const tr_b = (trColor >> 8) & 255

        // White/Light grey checking (> 245, 245, 245)
        const isTlWhite = tl_r > 245 && tl_g > 245 && tl_b > 245
        const isTrWhite = tr_r > 245 && tr_g > 245 && tr_b > 245

        return isTlWhite && isTrWhite
    } catch (err) {
        // If we fail to read, safely assume it's studio so we don't accidentally promote it
        return true
    }
}

/**
 * Scrape a single KYMCO scooter detail page.
 * 
 * Image strategy (WHITELIST + PIXEL ANALYSIS):
 *   - Action/lifestyle images are background-image on .img_height divs
 *   - They live under /wp-content/uploads/
 *   - Studio shots live under /media/schede/imm/ → REJECTED ALWAYS
 *   - BUT some wp-content/uploads/ images are ALSO studio shots!
 *   - We download and check corner pixels. Pure white = studio.
 *   - User rule: carichi prima le immagini giuste e poi le studio se ci sono
 *   - User rule: se una moto ha solo immagini STUDIO NON LA CARICHI
 */
async function scrapeBikeDetails(bikeMeta: { url: string }): Promise<ScrapedBike | null> {
    const { url } = bikeMeta
    try {
        console.log(`  🔍 Analyzing ${url}...`)
        const html = await fetchHTML(url)
        const $ = cheerio.load(html)

        // Check for 404
        const title = $('title').text().trim()
        if (title.includes('404') || title.includes('non trovata')) {
            console.log(`  ⏭️  Skipping (404): ${url}`)
            return null
        }

        // 1. Model name
        const model = $('h1').first().text().trim()
        if (!model) return null

        // 2. Year
        const year = new Date().getFullYear()

        // 3. Price
        let price: number | null = null
        const bodyText = $('body').text()
        const priceMatch = bodyText.match(/€\s*([\d.]+,\d{2})/)
        if (priceMatch) {
            const priceStr = priceMatch[1].replace(/\./g, '').replace(',', '.')
            price = parseFloat(priceStr)
            if (isNaN(price)) price = null
        }

        // 4. CC
        let cilindrata: number | null = null
        const ccMatch = bodyText.match(/cilindrata[:\s]*(\d+)/i)
        if (ccMatch) {
            cilindrata = parseInt(ccMatch[1])
        }

        // 5. Images
        const allBackgroundUrls: string[] = []

        $('[style*="background-image"], [style*="background"]').each((_, el) => {
            const style = $(el).attr('style') || ''
            const match = style.match(/url\(['"]?(.*?)['"]?\)/)
            if (!match) return

            const bgUrl = match[1]
            const lowerUrl = bgUrl.toLowerCase()

            // REJECT basic bad images
            if (lowerUrl.includes('/media/schede/')) return
            if (lowerUrl.includes('/media/')) return
            if (lowerUrl.includes('logo')) return
            if (lowerUrl.includes('icon')) return
            if (lowerUrl.includes('banner')) return
            if (!lowerUrl.includes('/wp-content/uploads/')) return
            if (!lowerUrl.includes('.jpg') && !lowerUrl.includes('.jpeg')) return

            const fullImgUrl = bgUrl.startsWith('http') ? bgUrl : `${KYMCO_BASE_URL}${bgUrl}`
            if (!allBackgroundUrls.includes(fullImgUrl)) {
                allBackgroundUrls.push(fullImgUrl)
            }
        })

        // Limit to 12 images to avoid too much jimp processing overhead
        const imagesToCheck = allBackgroundUrls.slice(0, 12)
        const actionImages: string[] = []
        const studioImages: string[] = []

        for (const imgUrl of imagesToCheck) {
            const isStudio = await isStudioImage(imgUrl)
            if (isStudio) {
                studioImages.push(imgUrl)
            } else {
                actionImages.push(imgUrl)
            }
        }

        console.log(`    📸 Found ${actionImages.length} action, ${studioImages.length} studio images.`)

        if (actionImages.length === 0) {
            console.log(`  ⏭️  Skipping ${model}: ONLY studio images found (or 0 images)`)
            return null
        }

        // "carichi prima le immagini giuste e poi le studio se ci sono"
        const finalImages = [...actionImages, ...studioImages].slice(0, 4)

        return {
            category: 'scooter',
            model,
            year,
            price,
            cilindrata,
            shortDescription: '',
            images: finalImages,
            url
        }

    } catch (err) {
        console.error(`  ❌ Failed to scrape ${url}:`, err)
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
            filename: `kymco-${Date.now()}.jpg`,
        })
        return asset._id
    } catch (err) {
        console.error(`  ❌ Failed image upload: ${imageUrl}`, (err as Error).message)
        return null
    }
}

async function ensureBrandKymco(): Promise<string> {
    const brandName = 'KYMCO'
    const existing = await sanityClient.fetch(`*[_type == "brand" && name match "KYMCO"][0]`)
    if (existing) return existing._id

    if (DRY_RUN) return 'fake-kymco-id'

    const created = await sanityClient.create({
        _type: 'brand',
        name: brandName,
        slug: { _type: 'slug', current: 'kymco' }
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
        console.log(`  🆕 Creating new scooter: ${bike.model} (${bike.year}) => Price: ${bike.price}, CC: ${bike.cilindrata}`)
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
            slug: { _type: 'slug', current: slugify(`kymco-${bike.model}-${bike.year}`) },
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
    console.log('🟡 Starting KYMCO Scooter Sync...')

    const bikesMeta = await discoverModels()
    console.log(`Found ${bikesMeta.length} unique scooter models to inspect.`)

    const brandId = await ensureBrandKymco()

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
