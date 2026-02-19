/**
 * Debug: analizza la pagina di un modello KTM per trovare la cilindrata.
 * Testa diversi selettori e pattern regex.
 */
import * as cheerio from 'cheerio'

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
}

// Test on a street bike (has cc) and a motocross (also has cc)
const TEST_URLS = [
    'https://www.ktm.com/it-it/models/motocross/4-tempi/2026-ktm-450-sx-f.html',
    'https://www.ktm.com/it-it/models/naked-bike/2025-ktm-390-duke.html',
    'https://www.ktm.com/it-it/models/adventure/2025-ktm-1390-superadventurer.html',
]

async function debugCilindrata(url: string) {
    console.log(`\n${'═'.repeat(80)}`)
    console.log(`🔍 ${url}`)
    console.log('═'.repeat(80))

    const res = await fetch(url, { headers: FETCH_HEADERS })
    const html = await res.text()
    const $ = cheerio.load(html)

    // 1. Check .c-technical-data__list-label (current selector)
    console.log('\n── Method 1: .c-technical-data__list-label ──')
    $('.c-technical-data__list-label').each((i, el) => {
        const label = $(el).text().trim()
        const value = $(el).next().text().trim()
        console.log(`  [${i}] "${label}" → "${value}"`)
    })

    // 2. Check all <dt>/<dd> pairs (spec tables often use definition lists)
    console.log('\n── Method 2: dt/dd pairs ──')
    $('dt').each((i, el) => {
        const label = $(el).text().trim().toLowerCase()
        const value = $(el).next('dd').text().trim()
        if (label.includes('cilindrata') || label.includes('displacement') || label.includes('hubraum') || label.includes('cc')) {
            console.log(`  ✅ [${i}] "${$(el).text().trim()}" → "${value}"`)
        }
    })

    // 3. Check table rows
    console.log('\n── Method 3: table rows ──')
    $('tr').each((i, el) => {
        const cells = $(el).find('td, th')
        if (cells.length >= 2) {
            const label = $(cells[0]).text().trim().toLowerCase()
            const value = $(cells[1]).text().trim()
            if (label.includes('cilindrata') || label.includes('displacement') || label.includes('hubraum') || label.includes('cc')) {
                console.log(`  ✅ [${i}] "${$(cells[0]).text().trim()}" → "${value}"`)
            }
        }
    })

    // 4. Regex search in full HTML for "cc" or "cm³" near numbers
    console.log('\n── Method 4: Regex in HTML ──')
    const ccRegex = /(\d{2,4}(?:[.,]\d+)?)\s*(?:cc|cm³|cm3)/gi
    const matches = [...html.matchAll(ccRegex)]
    const seen = new Set<string>()
    for (const m of matches) {
        const key = `${m[1]} ${m[0]}`
        if (!seen.has(key)) {
            seen.add(key)
            console.log(`  Found: "${m[0]}" → ${m[1]}`)
        }
    }

    // 5. Look for any element containing "cilindrata" text
    console.log('\n── Method 5: Elements containing "cilindrata" ──')
    $('*').each((_, el) => {
        const text = $(el).text().trim()
        if (text.toLowerCase().includes('cilindrata') && text.length < 200) {
            const tag = el.tagName || (el as any).name
            const cls = $(el).attr('class') || ''
            console.log(`  <${tag} class="${cls}"> "${text.substring(0, 100)}"`)
        }
    })

    // 6. Check JSON-LD for displacement
    console.log('\n── Method 6: JSON-LD ──')
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const json = JSON.parse($(el).html() || '')
            const str = JSON.stringify(json)
            if (str.toLowerCase().includes('displacement') || str.toLowerCase().includes('cilindrata') || str.toLowerCase().includes('engine')) {
                console.log(`  Found engine-related JSON-LD data`)
                // Print relevant fields
                const findFields = (obj: any, path: string = '') => {
                    if (!obj || typeof obj !== 'object') return
                    for (const [k, v] of Object.entries(obj)) {
                        const fullPath = path ? `${path}.${k}` : k
                        if (typeof v === 'string' || typeof v === 'number') {
                            const kl = k.toLowerCase()
                            if (kl.includes('displ') || kl.includes('engine') || kl.includes('cc') || kl.includes('cilindrata')) {
                                console.log(`    ${fullPath}: ${v}`)
                            }
                        } else {
                            findFields(v, fullPath)
                        }
                    }
                }
                findFields(json)
            }
        } catch { }
    })
}

async function main() {
    for (const url of TEST_URLS) {
        await debugCilindrata(url)
    }
}

main().catch(console.error)
