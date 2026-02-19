import * as cheerio from 'cheerio'
const FETCH_HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Accept-Language': 'it-IT' }
const URLS = [
    'https://www.ktm.com/it-it/models/naked-bike/2026-ktm-125-duke.html',
    'https://www.ktm.com/it-it/models/motocross/2-tempi/2026-ktm-125-sx.html',
    'https://www.ktm.com/it-it/models/motocross/4-tempi/2026-ktm-450-sx-f.html',
    'https://www.ktm.com/it-it/models/enduro/2-tempi/2026-ktm-300-exc.html',
    'https://www.ktm.com/it-it/models/adventure/2025-ktm-1390-superadventurer.html',
    'https://www.ktm.com/it-it/models/naked-bike/2026-ktm-1390-superduke-r.html',
]
async function test(url: string) {
    const model = url.split('/').pop()?.replace('.html', '') || ''
    const res = await fetch(url, { headers: FETCH_HEADERS })
    const $ = cheerio.load(await res.text())
    const imgs: string[] = []
    // 1. PHO_STAGE
    $('source, img').each((_, el) => {
        const srcset = $(el).attr('srcset') || ''
        let src = $(el).attr('src') || ''
        const imgUrl = srcset.split(',')[0]?.trim().split(' ')[0] || src
        if (!imgUrl) return
        let u = imgUrl; if (u.startsWith('//')) u = 'https:' + u
        if (u.startsWith('http') && u.includes('PHO_STAGE') && !u.includes('MOBILE')) imgs.unshift(u)
    })
    // 2. DET action only
    $('img').each((_, el) => {
        let src = $(el).attr('src') || ''; if (src.startsWith('//')) src = 'https:' + src
        if (!src.startsWith('http') || !src.includes('PHO_BIKE_DET')) return
        if (!src.toLowerCase().includes('action')) return
        if ($(el).closest('.js-model-slide, .models__slide, .glide__slide').length > 0) return
        imgs.push(src)
    })
    const unique = [...new Set(imgs)].slice(0, 4)
    const stage = unique.filter(u => u.includes('PHO_STAGE')).length
    const action = unique.filter(u => u.includes('action')).length
    console.log(`${model}: ${unique.length} imgs (${stage} hero, ${action} action)`)
    for (const u of unique) console.log(`  ${u.includes('STAGE') ? '🌄' : '🏍️'} ${u.split('/').pop()?.substring(0, 80)}`)
}
async function main() { for (const url of URLS) await test(url) }
main()
