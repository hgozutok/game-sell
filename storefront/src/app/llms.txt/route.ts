/**
 * GET /llms.txt — LLM dostu site ozeti (llmstxt.org konvansiyonu).
 * Icerik backend'deki /store/seo/llms-txt route'undan uretilir (SQL ile
 * katalog/koleksiyon verisi); bu handler proxy eder ve gunluk cache'ler.
 */
const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

// Build sirasinda prerender edilmesini engelle — Docker build'inde backend
// yokken fallback icerik imaja pisip 24 saat servis edilirdi.
// Cache'ler Cache-Control header ile yapilir.
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/store/seo/llms-txt`, {
      headers: PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {},
      cache: "no-store",
    })

    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return new Response(
      `# HUPIPLAY\n\n> Digital game key marketplace. Temporary error — content unavailable.\n`,
      {
        status: 200,
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      }
    )
  }
}
