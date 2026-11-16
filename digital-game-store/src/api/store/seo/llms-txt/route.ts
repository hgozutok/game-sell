import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/seo/llms-txt — LLM dostu site ozeti (llmstxt.org konvansiyonu:
 * https://llmstxt.org). Markdown dondurur: site geneli, ana sayfalar,
 * kategoriler ve ornek urun linkleri. Storefront /llms.txt bunu proxy eder.
 */

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const scope = req.scope
    const db = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    const SITE_URL =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "http://localhost:3000"

    // Kategoriler (koleksiyonlar = platform/magaza, kategoriler = tur)
    const collections = await db.raw(
      `SELECT handle, title FROM product_collection WHERE deleted_at IS NULL ORDER BY title LIMIT 100`
    )
    const categories = await db.raw(
      `SELECT handle, name FROM product_category WHERE deleted_at IS NULL AND is_active = true ORDER BY name LIMIT 100`
    )

    // Ornek urunler (en yeni 200) — tam liste sitemap'larda
    const products = await db.raw(
      `SELECT handle, title FROM product
       WHERE status = 'published' AND deleted_at IS NULL AND handle IS NOT NULL
       ORDER BY created_at DESC LIMIT 200`
    )

    const totalRes = await db.raw(
      `SELECT COUNT(*) AS total FROM product WHERE status = 'published' AND deleted_at IS NULL`
    )
    const total = Number(totalRes.rows?.[0]?.total || 0)

    const lines: string[] = []

    lines.push(`# HUPIPLAY`)
    lines.push("")
    lines.push(
      `> HUPIPLAY is a digital game key marketplace. Customers buy CD keys for Steam, Xbox, PlayStation, Nintendo and other platforms with instant email delivery. The catalog contains ${total.toLocaleString("en-US")} published game key products with live pricing in multiple currencies (USD, EUR, GBP, TRY).`
    )
    lines.push("")
    lines.push(
      `Product detail pages are server-rendered at /products/{handle}. Search is available at /search?q={query} (minimum 2 characters). Product structured data (schema.org/Product JSON-LD) is embedded on every product page.`
    )
    lines.push("")

    lines.push(`## Main pages`)
    lines.push("")
    lines.push(`- [All Games](${SITE_URL}/products): complete catalog with platform, genre, price filters and sorting`)
    lines.push(`- [Search](${SITE_URL}/search?q=): full-text product search (title and description match)`)
    lines.push(`- [Categories](${SITE_URL}/categories): browse by platform and genre`)
    lines.push(`- [Deals](${SITE_URL}/deals): discounted game keys`)
    lines.push(`- [How It Works](${SITE_URL}/how-it-works): ordering and key delivery process`)
    lines.push(`- [FAQ](${SITE_URL}/faq): frequently asked questions`)
    lines.push(`- [Contact](${SITE_URL}/contact): customer support`)
    lines.push(`- [Delivery Policy](${SITE_URL}/delivery): digital delivery details`)
    lines.push(`- [Terms of Service](${SITE_URL}/terms): legal terms`)
    lines.push(`- [Privacy Policy](${SITE_URL}/privacy): privacy policy`)
    lines.push("")

    const cols = collections.rows || []
    if (cols.length) {
      lines.push(`## Platforms (collections)`)
      lines.push("")
      for (const c of cols) {
        lines.push(`- [${c.title}](${SITE_URL}/categories/${c.handle})`)
      }
      lines.push("")
    }

    const cats = categories.rows || []
    if (cats.length) {
      lines.push(`## Genres (categories)`)
      lines.push("")
      for (const c of cats) {
        lines.push(`- [${c.name}](${SITE_URL}/categories/${c.handle})`)
      }
      lines.push("")
    }

    const prods = products.rows || []
    if (prods.length) {
      lines.push(`## Sample products (latest ${prods.length} of ${total.toLocaleString("en-US")})`)
      lines.push("")
      for (const p of prods) {
        lines.push(`- [${p.title}](${SITE_URL}/products/${p.handle})`)
      }
      lines.push("")
      lines.push(
        `Full product URL lists are available in the chunked sitemaps: ${Array.from(
          { length: 11 },
          (_, i) => `${SITE_URL}/sitemap/${i}.xml`
        ).join(", ")}`
      )
      lines.push("")
    }

    const body = lines.join("\n")
    res.setHeader("Content-Type", "text/markdown; charset=utf-8")
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
    res.status(200).send(body)
  } catch (error: any) {
    console.error("llms.txt error:", error)
    res.setHeader("Content-Type", "text/markdown; charset=utf-8")
    res.status(500).send(`# HUPIPLAY\n\nError generating llms.txt\n`)
  }
}
