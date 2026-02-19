/**
 * Debug: analizza le immagini di diverse pagine KTM per capire 
 * perché il filtro non funziona su certi modelli.
 */
import * as cheerio from 'cheerio'

const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
}

const TEST_URLS = [
    // Bikes that were deleted for "no images" — these SHOULD have images
    'https://www.ktm.com/it-it/models/enduro/4-tempi/2026-ktm-250-exc-f.html',
    'https://www.ktm.com/it-it/models/enduro/4-tempi/2026-ktm-350-exc-f.html',
    'https://www.ktm.com/it-it/models/enduro/4-tempi/2026-ktm-450-exc-f.html',
    'https://www.ktm.com/it-it/models/enduro/4-tempi/2026-ktm-500-exc-f.html',
    // One that works for comparison
    'https://www.ktm.com/it-it/models/motocross/4-tempi/2026-ktm-450-sx-f.html',
    // Bikes with wrong images reported
    'https://www.ktm.com/it-it/models/enduro/2-tempi/2026-ktm-300-exc.html',
]

const isLifestyle = (src: string) => {
    const s = src.toLowerCase()
    return s.includes('ctx') || s.includes('action') || s.includes('hero') || s.includes('human')
}

const isStudio = (src: string) => {
    const s = src.toLowerCase()
    return s.includes('pers') || s.includes('side') || s.includes('90_') || s.includes('studio') || s.includes('white') || s.endsWith('.png')
}

async function debugImages(url: string) {
    console.log(`\n${'═'.repeat(90)}`)
    console.log(`🔍 ${url}`)
    console.log('═'.repeat(90))

    const res = await fetch(url, { headers: FETCH_HEADERS })
    const html = await res.text()
    const $ = cheerio.load(html)

    // List ALL images that look like bike photos
    const allImages: { src: string; lifestyle: boolean; studio: boolean; hasDET: boolean; accepted: boolean; parent: string }[] = []

    $('img').each((_, el) => {
        let src = $(el).attr('src') || ''
        if (src.startsWith('//')) src = `https:${src}`

        // Only consider bike-related images (skip icons, logos, etc.)
        if (!src.startsWith('http')) return
        if (src.includes('svg') || src.includes('icon') || src.includes('logo') || src.includes('flag')) return
        if (src.includes('cookie') || src.includes('social') || src.includes('footer')) return

        const lifestyle = isLifestyle(src)
        const studio = isStudio(src)
        const hasDET = src.includes('DET') || src.includes('FACT')

        // Current filter logic from sync-ktm.ts:
        const accepted = lifestyle || (!studio && hasDET)

        const parentClass = $(el).parent().attr('class') || $(el).parent().parent().attr('class') || 'unknown'

        allImages.push({ src, lifestyle, studio, hasDET, accepted, parent: parentClass.substring(0, 60) })
    })

    // Show stats
    const accepted = allImages.filter(i => i.accepted)
    const rejected = allImages.filter(i => !i.accepted)
    const bikeImages = allImages.filter(i => i.src.includes('PHO_BIKE') || i.src.includes('azwecdnep'))

    console.log(`\n📊 Total images: ${allImages.length}`)
    console.log(`   Bike-related (PHO_BIKE/azwecdnep): ${bikeImages.length}`)
    console.log(`   ✅ Accepted by current filter: ${accepted.length}`)
    console.log(`   ❌ Rejected by current filter: ${rejected.length}`)

    // Show all bike images with their filter status
    console.log(`\n── Bike Images ──`)
    for (const img of bikeImages) {
        const status = img.accepted ? '✅' : '❌'
        const tags = []
        if (img.lifestyle) tags.push('LIFESTYLE')
        if (img.studio) tags.push('STUDIO')
        if (img.hasDET) tags.push('DET/FACT')
        if (!img.lifestyle && !img.studio && !img.hasDET) tags.push('UNTAGGED')

        // Extract just the filename for readability
        const filename = img.src.split('/').pop() || img.src
        console.log(`  ${status} [${tags.join(',')}] ${filename.substring(0, 80)}`)
        console.log(`     Parent: ${img.parent}`)
    }

    // Show rejected bike images specifically
    const rejectedBike = bikeImages.filter(i => !i.accepted)
    if (rejectedBike.length > 0) {
        console.log(`\n── ❌ Rejected Bike Images (these should maybe be accepted?) ──`)
        for (const img of rejectedBike) {
            console.log(`  ${img.src.substring(0, 120)}`)
            console.log(`    studio=${img.studio} lifestyle=${img.lifestyle} DET=${img.hasDET}`)
        }
    }

    // Also check hero container
    console.log(`\n── Hero Container Images ──`)
    $('.o-hero-stage__image-container img').each((_, el) => {
        let src = $(el).attr('src') || ''
        if (src.startsWith('//')) src = `https:${src}`
        console.log(`  ${src.substring(0, 120)}`)
    })

    // Check glide slider images
    console.log(`\n── Glide Slider Images ──`)
    $('.glide__slide img').each((_, el) => {
        let src = $(el).attr('src') || ''
        if (src.startsWith('//')) src = `https:${src}`
        if (src.startsWith('http')) console.log(`  ${src.substring(0, 120)}`)
    })
}

async function main() {
    for (const url of TEST_URLS) {
        await debugImages(url)
    }
}

main().catch(console.error)
