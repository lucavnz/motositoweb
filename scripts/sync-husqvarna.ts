/**
 * 💙 Sync Husqvarna → Sanity
 *
 * Scrapes all new motorcycles from https://www.husqvarna-motorcycles.com/it-it/models.html
 * and syncs them with Sanity CMS.
 *
 * Usage:
 *   npx tsx scripts/sync-husqvarna.ts              # Full sync
 *   npx tsx scripts/sync-husqvarna.ts --dry-run    # Preview without writing
 */

import { createClient, type SanityClient } from '@sanity/client'
import * as cheerio from 'cheerio'

// ── Config ──────────────────────────────────────────────

const SANITY_PROJECT_ID = '9r9hyqn3'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const SANITY_TOKEN = 'skANNlQ3ccntXq277S4WLz5UcblnyaTuuYztEJ2w4YC0OX2j0cPKRQevqbPtQx9OxPAJcIdwYSaBxOT5UPOuNYlp01ThqeypiWhvkKviOoBazHTf4kYjCxRGRVh3ojzgC7L3V4IgHLExflXRlql5K8rgY7dbe0eaN7EBalyI4T4aQLEX29x4' // Consider moving to env var

const HUSQVARNA_BASE_URL = 'https://www.husqvarna-motorcycles.com'
const MODELS_URL = 'https://www.husqvarna-motorcycles.com/it-it/models.html'

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
    'Cookie': 'onetrust-policy=accepted' // Sometimes helps, though likely needs real interaction or just luck
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

async function discoverCategories(): Promise<string[]> {
    console.log(`📄 Fetching models page: ${MODELS_URL}`)
    const html = await fetchHTML(MODELS_URL)
    const $ = cheerio.load(html)
    const categoryLinks: string[] = []

    // Similar structure to KTM: /it-it/models/naked.html
    $('a[href*="/models/"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href && !href.endsWith('models.html')) {
            const relative = href.split('/models/')[1]
            if (relative && !relative.includes('/')) {
                const fullUrl = href.startsWith('http') ? href : `${HUSQVARNA_BASE_URL}${href}`
                categoryLinks.push(fullUrl)
            }
        }
    })

    return [...new Set(categoryLinks)]
}

async function discoverModelsInCategory(categoryUrl: string): Promise<string[]> {
    console.log(`  📂 Fetching category: ${categoryUrl}`)
    const html = await fetchHTML(categoryUrl)
    const $ = cheerio.load(html)
    const modelLinks: string[] = []

    $('a[href*="/models/"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href) {
            // Model url logic: /it-it/models/category/model.html
            const parts = href.split('/models/')
            if (parts[1] && parts[1].includes('/')) {
                const fullUrl = href.startsWith('http') ? href : `${HUSQVARNA_BASE_URL}${href}`
                modelLinks.push(fullUrl)
            }
        }
    })

    return [...new Set(modelLinks)]
}

async function scrapeBikeDetails(url: string): Promise<ScrapedBike | null> {
    try {
        const html = await fetchHTML(url)
        const $ = cheerio.load(html)

        // 1. Model Name & Year
        // Husqvarna often looks like "Norden 901 Expedition 2026" or similar in h1
        const h1 = $('h1').first().text().trim()

        let year: number | null = null
        let model = h1

        // Regex to extract year if present (e.g. "Norden 901 2026" or "Svartpilen 401 | 2025")
        // It often comes at the end or beginning
        const yearMatches = h1.match(/(?:^|\s)(\d{4})(?:\s|$)/) || h1.match(/\|?\s*(\d{4})$/)
        if (yearMatches) {
            year = parseInt(yearMatches[1], 10)
            // Remove year from model name
            model = h1.replace(yearMatches[0], '').trim().replace(/\|\s*$/, '').trim()
        }

        // Fallback: Try URL (e.g. .../svartpilen-401-2025.html)
        if (!year) {
            const urlYear = url.match(/[/-](\d{4})(?:\.html|[/-]|$)/)
            if (urlYear) {
                year = parseInt(urlYear[1], 10)
            }
        }

        // If year not in title, default to current/next year or try to find it elsewhere? 
        // For now, if undefined, we might check meta tags or just default later.

        // 2. Price
        let price: number | null = null
        const priceText = $('.js-model-price p').text().trim() || $('.priceinfo__price-value').text().trim()

        if (priceText) {
            price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'))
        } else {
            // Regex fallback
            const patterns = [
                /(?:EUR|€)\s*([\d\.,]+)/i,
                /([\d\.,]+)\s*(?:EUR|€)/i,
                /content=["']([\d\.,]+)["']\s*itemprop=["']price["']/i,
            ]
            for (const regex of patterns) {
                const m = html.match(regex)
                if (m && m[1]) {
                    let raw = m[1].replace(/[^\d]/g, '')
                    // Simple heuristic: if > 1000 and < 50000 likely it
                    const val = parseInt(raw, 10)
                    if (val > 1000 && val < 50000) {
                        price = val
                        break
                    }
                }
            }
        }

        // 3. Displacement
        let cilindrata: number | null = null
        $('.c-technical-data__list-label').each((_, el) => {
            const label = $(el).text().trim().toLowerCase()
            if (label.includes('cilindrata') || label.includes('displacement')) {
                let val = $(el).next().text().trim()
                if (!val) val = $(el).parent().text().replace($(el).text(), '').trim()

                const match = val.match(/([\d.]+)/)
                if (match) cilindrata = Math.round(parseFloat(match[1]))
            }
        })
        if (!cilindrata) {
            const ccMatch = html.match(/"cilindrata"[^>]*>\s*([\d.,]+)\s*cm/i)
                || html.match(/(\d{2,4}(?:\.\d+)?)\s*cm³/i)
            if (ccMatch) cilindrata = Math.round(parseFloat(ccMatch[1]))
        }

        // 4. Description
        let description = ''
        const potentialParagraphs = $('p').filter((_, el) => {
            const text = $(el).text().trim()
            return text.length > 50 && !text.startsWith('*') && !text.includes('IVA') && !text.includes('Prezzo') && !text.includes('Cookie')
        })
        if (potentialParagraphs.length > 0) {
            description = potentialParagraphs.first().text().trim()
        }

        // 5. Images - STRICT FILTERING
        // ONLY PHO_STAGE (Hero) and PHO_BIKE_DET with "Action"
        const validImages: string[] = []

        // Helper to process URL
        const processImgUrl = (raw: string | undefined) => {
            if (!raw) return null
            let u = raw.trim()
            if (u.startsWith('//')) u = `https:${u}`
            if (!u.startsWith('http')) return null
            return u
        }

        $('source, img').each((_, el) => {
            const srcset = $(el).attr('srcset') || ''
            const src = $(el).attr('src') || ''
            // Prioritize higher res from srcset usually first or check 
            const imgUrl = processImgUrl(srcset.split(',')[0]?.trim().split(' ')[0] || src)

            if (!imgUrl) return

            // STRICT RULE:
            // 1. Must be PHO_STAGE (Hero)
            // 2. OR Must be PHO_BIKE_DET AND include "action" (case insensitive)

            const isStage = imgUrl.includes('PHO_STAGE')
            const isActionDetail = imgUrl.includes('PHO_BIKE_DET') && imgUrl.toLowerCase().includes('action')

            // Skip mobile versions
            if (imgUrl.includes('MOBILE')) return

            if (isStage || isActionDetail) {
                // Determine order: Stage first
                if (isStage) validImages.unshift(imgUrl)
                else validImages.push(imgUrl)
            }
        })

        const uniqueImages = [...new Set(validImages)].slice(0, 4)

        if (!model) return null

        // SKIP IF NO IMAGES
        if (uniqueImages.length === 0) {
            console.log(`  ⏭️  Skipping ${model}: no valid action/hero images found`)
            return null
        }

        // ⛔ Skip bikes with year < 2025
        if (year && year < 2025) {
            console.log(`  ⏭️  Skipping ${model}: anno troppo vecchio (${year})`)
            return null
        }

        // 6. Type Mapping
        let type = 'strada'
        // Url structure: /models/category/model.html
        if (url.includes('/motocross/') || url.includes('/kids-motocross/')) type = 'cross'
        else if (url.includes('/enduro/')) type = 'enduro'
        else if (url.includes('/electric/')) type = 'cross' // EE 5, etc
        else if (url.includes('/travel/')) type = 'strada' // Norden -> Strada (often used for touring)
        else if (url.includes('/naked/')) type = 'strada' // Svartpilen/Vitpilen -> Strada
        else if (url.includes('/supermoto/')) type = 'strada' // 701 SM -> Strada

        return {
            category: type,
            model,
            year: year || new Date().getFullYear(),
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
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        const asset = await sanityClient.assets.upload('image', buffer, {
            filename: `husqvarna-${Date.now()}.png`,
        })
        return asset._id
    } catch (err) {
        console.error(`  ❌ Failed detection/upload image ${imageUrl}`)
        return null
    }
}

async function ensureBrandHusqvarna(): Promise<string> {
    const brandName = 'HUSQVARNA'
    // Use match for case-insensitive just in case
    const existing = await sanityClient.fetch(`*[_type == "brand" && name match "HUSQVARNA"][0]`)
    if (existing) return existing._id

    if (DRY_RUN) return 'fake-husqvarna-id'

    const created = await sanityClient.create({
        _type: 'brand',
        name: brandName,
        slug: { _type: 'slug', current: 'husqvarna' }
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
        if (bike.year && (!existing.year || bike.year > existing.year)) patch.year = bike.year
        if (bike.cilindrata && !existing.cilindrata) patch.cilindrata = bike.cilindrata
        // description check? maybe partial

        if (Object.keys(patch).length > 0 && !DRY_RUN) {
            await sanityClient.patch(existing._id).set(patch).commit()
            console.log(`    ✏️ Updated ${bike.model}:`, patch)
        } else {
            console.log(`    👌 No updates needed`)
        }
    } else {
        console.log(`  🆕 Creating new bike: ${bike.model} (${bike.year})`)
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
            slug: { _type: 'slug', current: slugify(`husqvarna-${bike.model}-${bike.year}`) },
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
    console.log('💙 Starting Husqvarna Sync...')

    const catLinks = await discoverCategories()
    console.log(`Found ${catLinks.length} categories.`)

    const allBikeLinks = new Set<string>()
    for (const cat of catLinks) {
        const bikes = await discoverModelsInCategory(cat)
        bikes.forEach(b => allBikeLinks.add(b))
    }
    const bikeLinks = [...allBikeLinks]
    console.log(`Found ${bikeLinks.length} total unique bike models.`)

    const brandId = await ensureBrandHusqvarna()

    for (const link of bikeLinks) {
        console.log(`Processing ${link}...`)
        const data = await scrapeBikeDetails(link)
        if (data) {
            await processBike(data, brandId)
        }
        await sleep(1000)
    }

    console.log('Done.')
}

main().catch(console.error)
