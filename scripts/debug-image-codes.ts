import * as cheerio from 'cheerio'

const URLS = [
    'https://www.ktm.com/it-it/models/motocross/2-tempi/2026-ktm-250-sx.html',
    'https://www.ktm.com/it-it/models/motocross/4-tempi/2026-ktm-450-sx-f.html',
    'https://www.ktm.com/it-it/models/enduro/4-tempi/2026-ktm-250-exc-f.html',
]
const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html',
    'Accept-Language': 'it-IT,it;q=0.9',
}

async function main() {
    for (const url of URLS) {
        const model = url.split('/').pop()?.replace('.html', '') || ''
        console.log(`\n${'═'.repeat(80)}`)
        console.log(`🔍 ${model}`)
        console.log('═'.repeat(80))

        const res = await fetch(url, { headers: FETCH_HEADERS })
        const html = await res.text()
        const $ = cheerio.load(html)

        const seen = new Set()
        const images: { code: string; filename: string; fullUrl: string }[] = []

        $('img').each((_, el) => {
            let src = $(el).attr('src') || ''
            if (src.startsWith('//')) src = 'https:' + src
            if (!src.startsWith('http')) return
            if (!src.includes('PHO_BIKE') && !src.includes('azwecdnep')) return
            if (seen.has(src)) return
            seen.add(src)

            // Extract PHO_BIKE type code
            const match = src.match(/PHO_BIKE_([A-Z0-9_]+?)_KTM/i)
            const code = match ? match[1] : 'OTHER'
            const filename = (src.split('/').pop() || '').substring(0, 100)
            images.push({ code, filename, fullUrl: src })
        })

        // Group by code
        const groups: Record<string, number> = {}
        for (const img of images) {
            groups[img.code] = (groups[img.code] || 0) + 1
        }

        console.log('\n📊 Image types found:')
        for (const [code, count] of Object.entries(groups).sort()) {
            const status = ['90_RE', '90_LI', '90_REVO', 'PERS'].includes(code) ? '❌ STUDIO' : '✅ OK'
            console.log(`  ${status} ${code}: ${count} images`)
        }

        console.log('\n📋 All unique images:')
        for (const img of images) {
            const isStudio = ['90_RE', '90_LI', '90_REVO', 'PERS'].includes(img.code)
            console.log(`  ${isStudio ? '❌' : '✅'} [${img.code}] ${img.filename}`)
        }
    }
}
main()
