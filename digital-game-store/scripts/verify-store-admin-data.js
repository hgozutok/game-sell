const { chromium } = require("playwright")

const ROUTES = [
  "/admin/dashboard",
  "/admin/dashboard/kinguin",
  "/admin/dashboard/orders",
  "/admin/dashboard/keys",
]

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newContext().then((c) => c.newPage())

  await page.goto("http://localhost:3000/admin", { waitUntil: "domcontentloaded" })
  await page.waitForSelector("#email")
  await page.fill("#email", "admin@example.com")
  await page.fill("#password", "admin123")
  await Promise.all([page.waitForURL("**/admin/dashboard"), page.click("button[type=submit]")])

  for (const r of ROUTES) {
    await page.goto(`http://localhost:3000${r}`, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(4000)
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ")
    console.log(`\n=== ${r}`)
    console.log(text.slice(0, 700))
  }

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
