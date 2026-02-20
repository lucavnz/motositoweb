/**
 * Backfill cilindrata per tutte le moto KTM "nuova" che non ce l'hanno.
 * Riscrape la pagina originale e aggiorna Sanity.
 * Salta le moto Electric (non hanno cilindrata).
 */
import { createClient } from '@sanity/client'
import * as cheerio from 'cheerio'

const sanityClient = createClient({
    projectId: '9r9hyqn3',
    dataset: 'production',
    apiVersion: '2024-01-01',
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
})

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
}

const KTM_BASE_URL = 'https://www.ktm.com'
const MODELS_URL = 'https://www.ktm.com/it-it/models.html'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchHTML(url: string): Promise<string> {
    const res = await fetch(url, { headers: FETCH_HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Extract cilindrata from a KTM model page */
async function scrapeCilindrata(url: string): Promise<number | null> {
    try {
        const html = await fetchHTML(url)
        const $ = cheerio.load(html)

        // Method 1: Technical data labels
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

        // Method 2: Regex fallback
        if (!cilindrata) {
            const ccMatch = html.match(/([\d]{2,4}(?:\.\d+)?)\s*cm³/i)
            if (ccMatch) {
                const val = Math.round(parseFloat(ccMatch[1]))
                // Filter out nonsense (e.g. 6259cc from some cookie script)
                if (val > 50 && val < 2000) cilindrata = val
            }
        }

        return cilindrata
    } catch (err) {
        console.error(`  ❌ Errore scraping ${url}: ${err}`)
        return null
    }
}

/** Build a model→URL map by scraping the KTM site */
async function buildModelUrlMap(): Promise<Map<string, string>> {
    const map = new Map<string, string>()

    // Discover categories
    const mainHtml = await fetchHTML(MODELS_URL)
    const $main = cheerio.load(mainHtml)
    const categoryLinks: string[] = []

    $main('a[href*="/models/"]').each((_, el) => {
        const href = $main(el).attr('href')
        if (href && !href.endsWith('models.html')) {
            const relative = href.split('/models/')[1]
            if (relative && !relative.includes('/')) {
                const fullUrl = href.startsWith('http') ? href : `${KTM_BASE_URL}${href}`
                categoryLinks.push(fullUrl)
            }
        }
    })
    const categories = [...new Set(categoryLinks)]
    console.log(`Found ${categories.length} categories`)

    // Skip electric category (no cilindrata)
    const filteredCategories = categories.filter(c => !c.includes('/electric'))
    console.log(`After excluding electric: ${filteredCategories.length} categories`)

    // Discover models per category
    for (const catUrl of filteredCategories) {
        const catHtml = await fetchHTML(catUrl)
        const $cat = cheerio.load(catHtml)

        $cat('a[href*="/models/"]').each((_, el) => {
            const href = $cat(el).attr('href')
            if (href) {
                const parts = href.split('/models/')
                if (parts[1] && parts[1].includes('/')) {
                    const fullUrl = href.startsWith('http') ? href : `${KTM_BASE_URL}${href}`
                    // Extract model name from URL
                    // e.g. /models/motocross/4-tempi/2026-ktm-450-sx-f.html
                    const filename = fullUrl.split('/').pop()?.replace('.html', '') || ''
                    // Remove year prefix: 2026-ktm-450-sx-f → ktm-450-sx-f
                    const withoutYear = filename.replace(/^\d{4}-/, '')
                    // Remove ktm prefix: ktm-450-sx-f → 450-sx-f
                    const withoutBrand = withoutYear.replace(/^ktm-/, '')
                    // Convert to model name: 450-sx-f → 450 SX-F
                    const modelName = withoutBrand
                        .split('-')
                        .map(p => p.toUpperCase())
                        .join(' ')

                    map.set(modelName, fullUrl)
                }
            }
        })
        await sleep(300)
    }

    return map
}

async function main() {
    const brand = await sanityClient.fetch(`*[_type == "brand" && name == "KTM"][0]`)
    if (!brand) { console.log('❌ Brand KTM non trovato'); return }

    // Get all KTM nuova bikes without cilindrata
    const query = `*[_type == "motorcycle" && references($brandId) && condition == "nuova" && (!defined(cilindrata) || cilindrata == null || cilindrata == 0)]{
        _id, model, year, type
    }`
    const bikes = await sanityClient.fetch(query, { brandId: brand._id })

    // Exclude electric bikes
    const validBikes = bikes.filter((b: any) => {
        const m = (b.model || '').toLowerCase()
        return !m.includes('sx-e') && !m.includes('freeride') && !m.includes('brabus')
    })

    console.log(`\n📊 Moto KTM nuove senza cilindrata: ${bikes.length}`)
    console.log(`📊 Da processare (escluse electric/brabus): ${validBikes.length}\n`)

    if (validBikes.length === 0) {
        console.log('✅ Tutte le moto valide hanno la cilindrata!')
        return
    }

    for (const b of validBikes) {
        console.log(`  - ${b.model} (${b.year})`)
    }

    // Build URL map
    console.log('\n🔍 Costruendo mappa modelli → URL...')
    const urlMap = await buildModelUrlMap()
    console.log(`Trovati ${urlMap.size} modelli nel sito KTM\n`)

    // For each bike, find the URL and scrape cilindrata
    let updated = 0
    let failed = 0

    for (const bike of validBikes) {
        const model = bike.model as string

        // Try to find URL by matching model name
        let matchedUrl: string | null = null

        // Try exact match first
        for (const [mapModel, mapUrl] of urlMap.entries()) {
            if (mapModel === model.toUpperCase() ||
                mapModel.replace(/\s+/g, '') === model.toUpperCase().replace(/\s+/g, '')) {
                matchedUrl = mapUrl
                break
            }
        }

        // Try fuzzy match: check if model name is contained
        if (!matchedUrl) {
            const modelSlug = slugify(model)
            for (const [, mapUrl] of urlMap.entries()) {
                if (mapUrl.toLowerCase().includes(modelSlug)) {
                    matchedUrl = mapUrl
                    break
                }
            }
        }

        if (!matchedUrl) {
            console.log(`  ⚠️  ${model}: URL non trovato`)
            failed++
            continue
        }

        console.log(`  🔍 ${model} → scraping ${matchedUrl}`)
        const cc = await scrapeCilindrata(matchedUrl)

        if (cc) {
            await sanityClient.patch(bike._id).set({ cilindrata: cc }).commit()
            console.log(`  ✅ ${model}: cilindrata = ${cc} cc`)
            updated++
        } else {
            console.log(`  ⚠️  ${model}: cilindrata non trovata`)
            failed++
        }

        await sleep(500)
    }

    console.log(`\n✅ Aggiornate: ${updated} | ⚠️  Non trovate: ${failed}`)
}

main().catch(console.error)
