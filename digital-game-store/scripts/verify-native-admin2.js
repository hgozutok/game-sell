const { chromium } = require("playwright")

const CHECKS = [
  { name: "kinguin", url: "http://localhost:9000/app/kinguin" },
  {
    name: "product-detail",
    url: "http://localhost:9000/app/products/prod_01M77MKVJ04NWKH9CRRJR0M387",
  },
]

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newContext().then((c) => c.newPage())

  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200))
  })

  await page.goto("http://localhost:9000/app/login", { waitUntil: "domcontentloaded" })
  await page.waitForSelector("input[type=email]", { timeout: 30000 })
  await page.fill("input[type=email]", "admin@example.com")
  await page.fill("input[type=password]", "admin123")
  await page.click("button[type=submit]")
  await page.waitForTimeout(6000)
  console.log("AFTER LOGIN:", page.url())

  for (const c of CHECKS) {
    errors.length = 0
    await page.goto(c.url, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(7000)
    const body = await page.locator("body").innerText().catch(() => "")
    console.log(`\n=== ${c.name} (${page.url()})`)
    console.log(body.replace(/\s+/g, " ").slice(0, 500))
    console.log("CONSOLE:", JSON.stringify([...new Set(errors)].slice(0, 5), null, 2))
  }

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
