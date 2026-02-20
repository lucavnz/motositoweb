/**
 * 🧡 Sync KTM → Sanity
 *
 * Scrapes all new motorcycles from https://www.ktm.com/it-it/models.html
 * and syncs them with Sanity CMS.
 *
 * Usage:
 *   npx tsx scripts/sync-ktm.ts              # Full sync
 *   npx tsx scripts/sync-ktm.ts --dry-run    # Preview without writing
 */

import { createClient, type SanityClient } from '@sanity/client'
import * as cheerio from 'cheerio'

// ── Config ──────────────────────────────────────────────

const SANITY_PROJECT_ID = '9r9hyqn3'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const SANITY_TOKEN = process.env.SANITY_API_TOKEN as string;

const KTM_BASE_URL = 'https://www.ktm.com'
const MODELS_URL = 'https://www.ktm.com/it-it/models.html'

const DRY_RUN = process.argv.includes('--dry-run')

// ── Types ───────────────────────────────────────────────

interface ScrapedKtm {
    category: string
    model: string
    year: number | null
    price: number | null
    cilindrata: number | null
    shortDescription: string
    images: string[]
    url: string
}

interface SanityMoto {
    _id: string
    model: string
    price: number | null
    cilindrata: number | null
    shortDescription: string
    images: Array<{ _key: string; asset: { _ref: string } }> | null
    brand: { _id: string; name: string } | null
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

async function discoverCategories(): Promise<string[]> {
    console.log(`📄 Fetching models page: ${MODELS_URL}`)
    const html = await fetchHTML(MODELS_URL)
    const $ = cheerio.load(html)
    const categoryLinks: string[] = []

    // Categories are often in tiles or navigation. 
    // Based on exploration, they are like /it-it/models/naked-bike.html
    // Let's find all links that look like category pages
    $('a[href*="/models/"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href && !href.endsWith('models.html')) {
            // Valid category usually has 1 level after models: /it-it/models/naked-bike.html
            // Invalid (model): /it-it/models/naked-bike/125-duke.html
            const relative = href.split('/models/')[1]
            if (relative && !relative.includes('/')) {
                const fullUrl = href.startsWith('http') ? href : `${KTM_BASE_URL}${href}`
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
            // Model url: /it-it/models/category/model.html
            // It must have 2 slashes after models/
            const parts = href.split('/models/')
            if (parts[1] && parts[1].includes('/')) {
                const fullUrl = href.startsWith('http') ? href : `${KTM_BASE_URL}${href}`
                modelLinks.push(fullUrl)
            }
        }
    })

    return [...new Set(modelLinks)]
}

async function scrapeBikeDetails(url: string): Promise<ScrapedKtm | null> {
    try {
        const html = await fetchHTML(url)
        const $ = cheerio.load(html)

        // 1. Model Name & Year
        const h1 = $('h1.priceinfo__headline').first().text().trim() || $('h1').first().text().trim()

        let year: number | null = null
        let model = h1

        const yearMatch = h1.match(/^(\d{4})\s+(?:KTM\s+)?(.+)$/i)
        if (yearMatch) {
            year = parseInt(yearMatch[1], 10)
            model = yearMatch[2]
        }

        // 2. Price
        // Try selector first, then regex on full HTML
        let price: number | null = null
        const priceText = $('.priceinfo__price-value').text().trim()
        if (priceText) {
            price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'))
        } else {
            // Regex fallback with multiple patterns
            const htmlText = html

            // Patterns from debug script
            const patterns = [
                /(?:EUR|€)\s*([\d\.,]+)/i, // EUR 14.220
                /([\d\.,]+)\s*(?:EUR|€)/i, // 14.220 EUR
                /price["']?:\s*["']?([\d\.,]+)["']?/i, // JSON "price": "14220"
                /content=["']([\d\.,]+)["']\s*itemprop=["']price["']/i, // Meta itemprop="price" content="14220"
            ]

            let foundVal: number | null = null

            for (const regex of patterns) {
                const matches = [...htmlText.matchAll(new RegExp(regex, 'gi'))]

                // Debug log for 450 SX-F
                if (model.includes('450 SX-F')) {
                    matches.forEach(m => console.log(`      Regex ${regex} found: "${m[0]}" -> "${m[1]}"`))
                }

                for (const m of matches) {
                    if (!m[1]) continue

                    // Cleanup
                    let raw = m[1].replace(/[^\d,\.]/g, '') // Keep digits, dots, commas

                    // If raw is just a number (14220), parse it
                    // If raw is 14.220, replace dot -> 14220
                    // If raw is 14.220,00, split comma -> 14220

                    let val = 0

                    if (raw.includes(',')) {
                        // Likely decimal comma e.g. 14.220,00
                        const parts = raw.split(',')
                        val = parseInt(parts[0].replace(/\./g, ''), 10)
                    } else if (raw.includes('.')) {
                        // Could be 14.220 or 14.22 (decimal dot). 
                        // In IT site, usually dot is thousand separator IF followed by 3 digits?
                        // Or "EUR 14.220" -> 14220
                        val = parseInt(raw.replace(/\./g, ''), 10)
                    } else {
                        // Plain integer
                        val = parseInt(raw, 10)
                    }

                    if (val > 1000 && val < 50000) {
                        foundVal = val
                        break
                    }
                }
                if (foundVal) break
            }
            price = foundVal
        }

        // 3. Displacement
        let cilindrata: number | null = null
        $('.c-technical-data__list-label').each((_, el) => {
            const label = $(el).text().trim().toLowerCase()
            if (label.includes('cilindrata') || label.includes('displacement')) {
                // Try next sibling first, then parent text
                let val = $(el).next().text().trim()
                if (!val) {
                    // Fallback: parent <li> contains both label + value
                    val = $(el).parent().text().replace($(el).text(), '').trim()
                }
                const match = val.match(/([\d.]+)/)
                if (match) cilindrata = Math.round(parseFloat(match[1]))
            }
        })

        // Regex fallback for cilindrata from HTML
        if (!cilindrata) {
            const ccMatch = html.match(/"cilindrata"[^>]*>\s*([\d.,]+)\s*cm/i)
                || html.match(/(\d{2,4}(?:\.\d+)?)\s*cm³/i)
            if (ccMatch) cilindrata = Math.round(parseFloat(ccMatch[1]))
        }

        // 4. Description
        // Exclude legal disclaimers starting with * or "Prezzo"
        let description = ''
        const potentialParagraphs = $('p').filter((_, el) => {
            const text = $(el).text().trim()
            // Rule: > 50 chars, doesn't start with *, doesn't contain "IVA", doesn't contain "Prezzo"
            return text.length > 50 && !text.startsWith('*') && !text.includes('IVA') && !text.includes('Prezzo') && !text.includes('Cookie')
        })

        if (potentialParagraphs.length > 0) {
            description = potentialParagraphs.first().text().trim()
        }

        // 5. Images — Based on browser inspection of KTM pages:
        //   - PHO_STAGE = Hero action images (lifestyle, outdoor) — TOP PRIORITY
        //   - PHO_BIKE_DET with "action" in URL = Action detail shots — GOOD
        //   - PHO_BIKE_DET generic = Close-up feature shots (acceptable)
        //   - Images inside .js-model-slide / .models__slide = STUDIO SLIDER → REJECT
        //   - PHO_BIKE_90_, PHO_BIKE_PERS = Studio side views → REJECT
        //   - Hero uses <picture><source> elements, not just <img>
        const validImages: string[] = []

        // 1. Extract PHO_STAGE hero images from <picture><source> and <img>
        $('source, img').each((_, el) => {
            const srcset = $(el).attr('srcset') || ''
            let src = $(el).attr('src') || ''
            const imgUrl = srcset.split(',')[0]?.trim().split(' ')[0] || src
            if (!imgUrl) return

            let finalUrl = imgUrl
            if (finalUrl.startsWith('//')) finalUrl = `https:${finalUrl}`
            if (!finalUrl.startsWith('http')) return

            if (finalUrl.includes('PHO_STAGE')) {
                // Skip mobile-specific versions (smaller)
                if (!finalUrl.includes('MOBILE')) {
                    validImages.unshift(finalUrl) // Highest priority
                }
            }
        })

        // 2. Extract ONLY action-labeled DET images (not generic close-ups which are still studio white-bg)
        $('img').each((_, el) => {
            let src = $(el).attr('src') || ''
            if (src.startsWith('//')) src = `https:${src}`
            if (!src.startsWith('http')) return
            if (!src.includes('PHO_BIKE_DET')) return

            // ONLY accept if "action" is in the filename
            if (!src.toLowerCase().includes('action')) return

            // REJECT if inside studio slider container
            const isInSlider = $(el).closest('.js-model-slide, .models__slide, .glide__slide').length > 0
            if (isInSlider) return

            validImages.push(src)
        })

        const uniqueImages = [...new Set(validImages)].slice(0, 4)

        if (!model) return null

        // ⛔ Skip bikes with NO images — user explicitly requested this
        if (uniqueImages.length === 0) {
            console.log(`  ⏭️  Skipping ${model}: no valid images found`)
            return null
        }

        // ⛔ Skip bikes with year < 2025
        if (year && year < 2025) {
            console.log(`  ⏭️  Skipping ${model}: anno troppo vecchio (${year})`)
            return null
        }

        // ⛔ Skip BRABUS models
        if (model.toUpperCase().includes('BRABUS')) {
            console.log(`  ⏭️  Skipping ${model}: BRABUS`)
            return null
        }

        // 6. Type Mapping logic correction
        // e.g. https://www.ktm.com/it-it/models/motocross/4-tempi/2026-ktm-450-sx-f.html
        let type = 'strada' // default

        if (url.includes('/motocross/') || url.includes('/mx/')) type = 'cross'
        else if (url.includes('/enduro/')) type = 'enduro'
        else if (url.includes('sx-e')) type = 'cross' // Electric kids -> Cross
        else if (url.includes('freeride')) type = 'enduro' // Electric freeride -> Enduro
        else type = 'strada' // Everything else (Naked, Travel, Supersport, etc.)

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
            filename: `ktm-${Date.now()}.png`,
        })
        return asset._id
    } catch (err) {
        console.error(`  ❌ Failed detection/upload image ${imageUrl}`)
        return null
    }
}

async function ensureBrandKTM(): Promise<string> {
    const brandName = 'KTM'
    const existing = await sanityClient.fetch(`*[_type == "brand" && name == "${brandName}"][0]`)
    if (existing) return existing._id

    if (DRY_RUN) return 'fake-ktm-id'

    const created = await sanityClient.create({
        _type: 'brand',
        name: brandName,
        slug: { _type: 'slug', current: 'ktm' }
    })
    return created._id
}

async function processBike(bike: ScrapedKtm, brandId: string) {
    if (!bike.model) return
    if (bike.images.length === 0) {
        console.log(`  ⏭️  Skipping ${bike.model}: no images`)
        return
    }

    // Check if exists
    // Matching logic: Same brand, same model name AND condition == 'nuova'.
    // Use strict check to avoid updating used bikes.

    // Find by Slug or normalized model name
    const matches = await sanityClient.fetch(
        `*[_type == "motorcycle" && references($brandId) && model == $model && condition == "nuova"]`,
        { brandId, model: bike.model }
    )

    const existing = matches[0]

    if (existing) {
        console.log(`  Found existing ${bike.model}. Checking for updates...`)
        const patch: any = {}
        if (bike.price && existing.price !== bike.price) patch.price = bike.price
        // Always update year to latest?
        if (bike.year && (!existing.year || bike.year > existing.year)) patch.year = bike.year
        if (bike.cilindrata && !existing.cilindrata) patch.cilindrata = bike.cilindrata
        // Don't overwrite description if exists, unless empty
        if (!existing.shortDescription && bike.shortDescription) patch.shortDescription = bike.shortDescription

        if (Object.keys(patch).length > 0 && !DRY_RUN) {
            await sanityClient.patch(existing._id).set(patch).commit()
            console.log(`    ✏️ Updated ${bike.model}:`, patch)
        } else {
            console.log(`    👌 No updates needed`)
        }
    } else {
        console.log(`  🆕 Creating new bike: ${bike.model} (${bike.year})`)
        if (DRY_RUN) return

        // Upload images
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
            slug: { _type: 'slug', current: slugify(`${bike.model}-${bike.year}`) },
            brand: { _type: 'reference', _ref: brandId },
            year: bike.year,
            type: bike.category || 'strada', // Use scraped category!
            condition: 'nuova', // It's from official site
            price: bike.price,
            cilindrata: bike.cilindrata,
            shortDescription: bike.shortDescription,
            images: imageAssets
        }

        // Log final data for debugging
        console.log(`    Data for ${bike.model}: Price=${bike.price} Type=${bike.category} CC=${bike.cilindrata}`)

        await sanityClient.create(doc)
    }
}


// ── Main ────────────────────────────────────────────────

async function main() {
    console.log('🧡 Starting KTM Sync...')

    // 1. Get Categories
    const catLinks = await discoverCategories()
    console.log(`Found ${catLinks.length} categories.`)

    // 2. Discover ALL bikes
    const allBikeLinks = new Set<string>()
    for (const cat of catLinks) {
        const bikes = await discoverModelsInCategory(cat)
        bikes.forEach(b => allBikeLinks.add(b))
    }
    const bikeLinks = [...allBikeLinks]
    console.log(`Found ${bikeLinks.length} total unique bike models.`)

    // 3. Process
    const brandId = await ensureBrandKTM()

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
