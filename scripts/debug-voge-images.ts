import * as cheerio from 'cheerio'

const ALL_URLS = [
    'https://vogeitaly.it/sfida-sr1/',
    'https://vogeitaly.it/sfida-sr4-max/',
    'https://vogeitaly.it/sfida-sr1-adv/',
    'https://vogeitaly.it/sfida-sr2-adv/',
    'https://vogeitaly.it/sfida-sr16/',
    'https://vogeitaly.it/sfida-sr16-200/',
    'https://vogeitaly.it/sfida-sr3-2/',
    'https://vogeitaly.it/brivido-125r',
    'https://vogeitaly.it/brivido-625r/',
    'https://vogeitaly.it/trofeo-300ac/',
    'https://vogeitaly.it/trofeo-300acx-scrambler/',
    'https://vogeitaly.it/trofeo-350ac/',
    'https://vogeitaly.it/trofeo-500ac/',
    'https://vogeitaly.it/trofeo-525acx/',
    'https://vogeitaly.it/valico-300-rally/',
    'https://vogeitaly.it/valico-800rally/',
    'https://vogeitaly.it/valico525dsx/',
    'https://vogeitaly.it/valico-625dsx/',
    'https://vogeitaly.it/valico-900dsx/',
]

async function testPage(url: string) {
    const res = await fetch(url)
    const html = await res.text()
    const $ = cheerio.load(html)
    const validImages: string[] = []

    const checkImg = (imgUrl: string | undefined, isHero = false) => {
        if (!imgUrl) return
        if (!imgUrl.startsWith('http')) return
        const lowerUrl = imgUrl.toLowerCase()
        if (lowerUrl.includes('.png')) return
        if (lowerUrl.includes('logo')) return
        if (lowerUrl.includes('icon')) return
        if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
            if (isHero) validImages.unshift(imgUrl)
            else validImages.push(imgUrl)
        }
    }

    // SOURCE 1: Hero
    const heroImg = $('img.rev-slidebg').first()
    if (heroImg.length) checkImg(heroImg.attr('src'), true)

    // SOURCE 2: vc_single_image-img gallery
    $('img.vc_single_image-img').each((_, el) => {
        const parentHref = $(el).closest('a').attr('href') || ''
        if (!parentHref.match(/\.(jpg|jpeg)$/i)) return
        if (parentHref.toLowerCase().includes('estudio')) return
        checkImg(parentHref)
    })

    // SOURCE 3: Fallback to mkdf-ig-lightbox
    const galleryCount = validImages.length - (heroImg.length ? 1 : 0)
    if (galleryCount === 0) {
        $('a.mkdf-ig-lightbox img, .mkdf-ig-lightbox img').each((_, el) => {
            const parentHref = $(el).closest('a').attr('href') || ''
            if (!parentHref.match(/\.(jpg|jpeg)$/i)) return
            if (parentHref.toLowerCase().includes('estudio')) return
            checkImg(parentHref)
        })
    }

    const uniqueImages = [...new Set(validImages)].slice(0, 4)
    const slug = url.split('/').filter(Boolean).pop()
    const source = galleryCount === 0 ? 'FALLBACK' : 'PRIMARY'
    console.log(`${slug}: ${uniqueImages.length} imgs [${source}] → ${uniqueImages.map(u => u.split('/').pop()).join(', ')}`)
}

async function main() {
    for (const url of ALL_URLS) {
        await testPage(url)
    }
}

main()
