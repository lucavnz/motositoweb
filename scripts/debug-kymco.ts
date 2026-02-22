import * as cheerio from 'cheerio'

// ALL KYMCO scooter model URLs
const URLS = [
    'https://kymco.it/Prodotti/_FIL50%202',
    'https://kymco.it/Prodotti/_AGL%2050P%2016',
    'https://kymco.it/Prodotti/_S8%20050%20RP2',
    'https://kymco.it/Prodotti/_A125SP',
    'https://kymco.it/Prodotti/_A125PU16E5',
    'https://kymco.it/Prodotti/_SKT125',
    'https://kymco.it/Prodotti/_D125%20RF',
    'https://kymco.it/Prodotti/_D125%20RT',
    'https://kymco.it/Prodotti/_DX125P',
    'https://kymco.it/Prodotti/_LK%20125P',
    'https://kymco.it/Prodotti/_MIC125P',
    'https://kymco.it/Prodotti/_P125%20S%20P',
    'https://kymco.it/Prodotti/_A350',
    'https://kymco.it/Prodotti/_DT350GT',
    'https://kymco.it/Prodotti/_DTX360',
    'https://kymco.it/Prodotti/_D150%20RF',
    'https://kymco.it/Prodotti/_D150%20RT',
    'https://kymco.it/Prodotti/_P200%20S%20E5',
    'https://kymco.it/Prodotti/_XT250P',
    'https://kymco.it/Prodotti/_XT300%20E5',
    'https://kymco.it/Prodotti/_KRV200',
]

async function checkPage(url: string) {
    const res = await fetch(url)
    const html = await res.text()
    const $ = cheerio.load(html)

    const title = $('h1').first().text().trim()
    if ($('title').text().includes('404')) {
        console.log(`${title || '404'} | ${url} → SKIP (404)`)
        return
    }

    // Gather ALL background-image URLs from .img_height
    const bgImages: string[] = []
    const studioImgs: string[] = []

    // Background images from .img_height (the "gallery" images)
    $('.img_height[style*="background-image"], .img_height[style*="background"]').each((_, el) => {
        const style = $(el).attr('style') || ''
        const match = style.match(/url\(['"]?(.*?)['"]?\)/)
        if (!match) return
        const bgUrl = match[1]
        if (!bgUrl.includes('.jpg') && !bgUrl.includes('.jpeg')) return
        if (!bgImages.includes(bgUrl)) bgImages.push(bgUrl)
    })

    // Studio images from /media/schede/imm/
    $('img').each((_, el) => {
        const src = $(el).attr('src') || ''
        if (src.includes('/media/schede/') && (src.includes('.jpg') || src.includes('.jpeg'))) {
            if (!studioImgs.includes(src)) studioImgs.push(src)
        }
    })

    console.log(`\n=== ${title} ===`)
    console.log(`  bg-images (${bgImages.length}):`)
    bgImages.slice(0, 6).forEach(u => console.log(`    ${u.split('/').pop()}`))
    if (studioImgs.length > 0) {
        console.log(`  studio /media/schede/ (${studioImgs.length}):`)
        studioImgs.forEach(u => console.log(`    ${u.split('/').pop()}`))
    }
}

async function main() {
    for (const url of URLS) {
        await checkPage(url)
    }
}

main()
