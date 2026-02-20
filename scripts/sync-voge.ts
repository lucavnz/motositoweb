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
    console.log(`📄 Fetching Voge homepage: ${VOGE_BASE_URL}`)
    const html = await fetchHTML(VOGE_BASE_URL)
    const $ = cheerio.load(html)

    // Voge menu structure:
    // .menu-item -> a (Category, e.g. Brivido) -> .sub-menu -> a (Model link)

    const models: { url: string, type: string }[] = []
    const seen = new Set<string>()

    // Simply look for all menu links
    $('li.menu-item a').each((_, el) => {
        const href = $(el).attr('href')
        if (href && (href.startsWith('http') || href.startsWith('/'))) {
            const url = href.startsWith('http') ? href : `${VOGE_BASE_URL}${href}`
            const lowerHref = url.toLowerCase()

            const isBlacklisted = ['promozioni', 'accessori', 'garanzia', 'di-nuovo', 'concessionari', 'care', 'faq', 'promo', 'privacy', 'informativa', 'chi-siamo', 'contatti', 'news'].some(w => lowerHref.includes(w))

            // Strictly require one of the family names in the URL
            if (!isBlacklisted && (lowerHref.includes('valico') || lowerHref.includes('brivido') || lowerHref.includes('trofeo') || lowerHref.includes('sfida'))) {
                let type = 'strada'
                if (lowerHref.includes('valico')) type = 'enduro'
                if (lowerHref.includes('sfida')) type = 'scooter'

                if (!seen.has(url)) {
                    seen.add(url)
                    models.push({ url, type })
                }
            }
        }
    })

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

        // 5a. Hero
        $('.tp-bgimg').each((_, el) => {
            const bg = $(el).attr('data-bg') || $(el).css('background-image')
            if (bg) {
                const match = bg.match(/url\(['"]?(.*?)['"]?\)/)
                const cleanUrl = match ? match[1] : bg
                checkImg(cleanUrl, true)
            }
        })

        // 5b. Gallery
        $('img').each((_, el) => {
            const src = $(el).attr('src')
            // Often there's a higher res image in parent link for gallery
            const parentHref = $(el).closest('a.prettyphoto').attr('href')

            checkImg(parentHref || src)
        })

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
