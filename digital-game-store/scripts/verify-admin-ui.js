const { chromium } = require("playwright")

const BASE = "http://localhost:3000"

const ROUTES = [
  "/admin/dashboard",
  "/admin/dashboard/products",
  "/admin/dashboard/orders",
  "/admin/dashboard/keys",
  "/admin/dashboard/pricing",
  "/admin/dashboard/currency-rates",
  "/admin/dashboard/payments",
  "/admin/dashboard/slider",
  "/admin/dashboard/settings",
  "/admin/dashboard/sync",
  "/admin/dashboard/kinguin",
  "/admin/dashboard/kinguin/orders",
  "/admin/dashboard/products/import",
]

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  let consoleErrors = []
  let failedRequests = []

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200))
  })
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/admin")) {
      failedRequests.push(
        `${res.status()} ${res.request().method()} ${res.url().replace("http://localhost:9000", "")}`
      )
    }
  })

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" })
  await page.waitForSelector("#email", { timeout: 30000 })
  await page.fill("#email", "admin@example.com")
  await page.fill("#password", "admin123")
  await Promise.all([
    page.waitForURL("**/admin/dashboard", { timeout: 30000 }),
    page.click("button[type=submit]"),
  ])
  console.log("LOGIN: OK ->", page.url())

  const results = []

  for (const route of ROUTES) {
    consoleErrors = []
    failedRequests = []
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(3500)

    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) || ""
    const bodyText = await page.locator("body").innerText().catch(() => "")

    const errorish = bodyText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) =>
        /(Failed to|failed|hata|Error:|401|403|500|yüklenemedi|Cannot read|Request failed)/i.test(l)
      )
      .slice(0, 4)

    results.push({
      route,
      h1: h1.trim().slice(0, 60),
      errors: errorish,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 4),
      http: [...new Set(failedRequests)].slice(0, 6),
      url: page.url(),
    })
  }

  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
