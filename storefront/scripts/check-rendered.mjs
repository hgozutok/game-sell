// Render edilen sayfalarda ham anahtar sizintisini ve dil/dir dogrulugunu kontrol eder.
// Kullanim: node scripts/check-rendered.mjs [baseUrl]
const baseUrl = process.argv[2] || 'http://localhost:3101'

const locales = ['en', 'tr', 'de', 'fr', 'ar']
const paths = [
  '/',
  '/products',
  '/categories',
  '/deals',
  '/cart',
  '/login',
  '/faq',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/cookies',
  '/returns',
  '/delivery',
  '/how-it-works',
  '/blog',
  '/blog/gta-6-pc-release-date',
]

const keyPattern = /(?:content|legal|catalog|cart|checkout|success|failed|account|keys|orderDetail|search|deals|error|notFound|globalError|footer|nav|home|common|product|productCard|stripe|login|register|status|language|whatsapp)\.[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z0-9.]+/g

const run = async () => {
  let problems = 0
  for (const locale of locales) {
    for (const path of paths) {
      const url = baseUrl + path
      const res = await fetch(url, {
        headers: { cookie: `NEXT_LOCALE=${locale}` },
        redirect: 'manual',
      })
      if (res.status >= 400) {
        console.log(`FAIL  ${locale} ${path} -> ${res.status}`)
        problems += 1
        continue
      }
      if (res.status >= 300) continue // yonlendirme (orn. /checkout -> /cart) sorun degil
      const html = await res.text()
      const lang = (html.match(/<html[^>]*lang="([^"]+)"/) || [])[1]
      const dir = (html.match(/<html[^>]*dir="([^"]+)"/) || [])[1]
      const expectedDir = locale === 'ar' ? 'rtl' : 'ltr'
      const leaks = [...new Set(html.match(keyPattern) || [])]
      const issues = []
      if (lang !== locale) issues.push(`lang=${lang}`)
      if (dir !== expectedDir) issues.push(`dir=${dir}`)
      if (leaks.length) issues.push(`keys: ${leaks.slice(0, 4).join(', ')}`)
      if (issues.length) {
        console.log(`WARN  ${locale} ${path} -> ${issues.join(' | ')}`)
        problems += 1
      }
    }
  }
  console.log(problems === 0 ? 'Tum sayfalar temiz.' : `${problems} uyari.`)
}

run()
