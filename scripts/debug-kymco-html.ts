import * as cheerio from 'cheerio'

async function checkPage(url: string) {
    const res = await fetch(url)
    const html = await res.text()
    const $ = cheerio.load(html)

    console.log(`\n=== Images for ${url} ===`)

    // 1. Fotorama gallery images
    $('.fotorama a').each((_, el) => {
        const href = $(el).attr('href') || ''
        console.log(`[FOTORAMA] ${href}`)
    })

    // 2. .img_height background images
    $('.img_height[style*="background-image"], .img_height[style*="background"]').each((_, el) => {
        const style = $(el).attr('style') || ''
        const match = style.match(/url\(['"]?(.*?)['"]?\)/)
        if (match) console.log(`[.img_height] ${match[1]}`)
    })

    // 3. Main studio image /media/schede/imm/
    $('img[src*="/media/schede/imm/"]').each((_, el) => {
        const src = $(el).attr('src')
        console.log(`[MAIN_STUDIO] ${src}`)
    })

    // 4. Any other wp-content/uploads images
    $('img[src*="wp-content/uploads/"]').each((_, el) => {
        const src = $(el).attr('src')
        console.log(`[OTHER_IMG] ${src}`)
    })
}

checkPage('https://kymco.it/Prodotti/_FIL50%202')
checkPage('https://kymco.it/Prodotti/_KRV200')
