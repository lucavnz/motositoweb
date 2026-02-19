/**
 * 🐞 Debug KTM Scraper
 *
 * Fetches a single page and logs key elements to debug selectors.
 */

import * as cheerio from 'cheerio'

const URL = 'https://www.ktm.com/it-it/models/motocross/4-tempi/2026-ktm-450-sx-f.html'

async function main() {
    console.log(`🔍 Debugging: ${URL}`)
    const res = await fetch(URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    })
    const html = await res.text()
    const $ = cheerio.load(html)

    console.log('\n─── PRICE ───')
    const price = $('.priceinfo__price-value').text().trim()
    console.log(`Selector .priceinfo__price-value: "${price}"`)

    // Check if price is in a different place (e.g. JSON linked data or another class)
    if (!price) {
        console.log('Price not found in standard selector. Dumping other potential price containers:')
        // Dump anything with "price" in class or id
        $('[class*="price"], [id*="price"]').each((i, el) => {
            console.log(`  [${i}] <${el.tagName} class="${$(el).attr('class')}">: "${$(el).text().trim().substring(0, 50)}..."`)
        })
    }

    // Raw Regex Search
    console.log('\n─── RAW REGEX SEARCH ───')
    const htmlText = html
    const priceRegex = /€\s*[\d.]+/g
    const eurRegex = /EUR\s*[\d.]+/g
    const priceWithComma = /[\d.]+,[\d]{2}\s*(?:EUR|€)/g

    console.log('Searching for "EUR" or "€":')
    const matches = [...htmlText.matchAll(priceRegex), ...htmlText.matchAll(eurRegex), ...htmlText.matchAll(priceWithComma)]
    matches.forEach(m => console.log(`  Found: "${m[0]}" at char ${m.index}`))

    console.log('\n─── DESCRIPTION ───')
    const desc = $('.c-intro-text__content p').first().text().trim()
    console.log(`Selector .c-intro-text__content p: "${desc.substring(0, 100)}..."`)

    if (!desc) {
        console.log('Description not found. Dumping potential intro text containers:')
        $('[class*="intro"], [class*="desc"]').each((i, el) => {
            console.log(`  [${i}] <${el.tagName} class="${$(el).attr('class')}">: "${$(el).text().trim().substring(0, 50)}..."`)
        })
    }

    console.log('\n─── ALL PARAGRAPHS (First 10) ───')
    $('p').each((i, el) => {
        if (i < 10) {
            console.log(`  [${i}] <p class="${$(el).attr('class')}">: "${$(el).text().trim().substring(0, 100)}..."`)
        }
    })

    // Check for other potential description containers
    console.log('\n─── OTHER DESC CONTAINERS ───')
    $('[class*="description"], [id*="description"]').each((i, el) => {
        console.log(`  [${i}] <${el.tagName} class="${$(el).attr('class')}">: "${$(el).text().trim().substring(0, 50)}..."`)
    })

    console.log('\n─── IMAGES ───')
    $('img').each((i, el) => {
        const src = $(el).attr('src')
        if (src && src.startsWith('http') && (src.includes('PHO') || src.includes('blue-print'))) {
            const parentClass = $(el).parent().attr('class') || 'unknown-parent'
            console.log(`  [${i}] ${src} (Parent: ${parentClass})`)
        }
    })

    // Check for JSON-LDSchema
    console.log('\n─── JSON-LD ───')
    $('script[type="application/ld+json"]').each((i, el) => {
        console.log(`  [${i}] ${$(el).html()?.substring(0, 200)}...`)
    })

}

main()
