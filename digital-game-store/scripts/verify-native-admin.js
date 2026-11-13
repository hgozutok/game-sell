const { chromium } = require("playwright")

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newContext().then((c) => c.newPage())

  const notFound = []
  page.on("response", (r) => {
    if (r.status() === 404) notFound.push(r.url())
  })

  await page.goto("http://localhost:3000/admin", { waitUntil: "domcontentloaded" })
  await page.waitForSelector("#email")
  await page.fill("#email", "admin@example.com")
  await page.fill("#password", "admin123")
  await Promise.all([
    page.waitForURL("**/admin/dashboard"),
    page.click("button[type=submit]"),
  ])
  await page.waitForTimeout(3000)
  console.log("STORE 404s:", JSON.stringify([...new Set(notFound)], null, 2))

  // Native Medusa admin: login + Kinguin extension page
  const admin = await browser.newContext().then((c) => c.newPage())
  const adminErrors = []
  admin.on("console", (m) => {
    if (m.type() === "error") adminErrors.push(m.text().slice(0, 160))
  })
  const adminHttp = []
  admin.on("response", (r) => {
    if (r.status() >= 400) adminHttp.push(`${r.status()} ${r.url().replace("http://localhost:9000", "")}`)
  })

  await admin.goto("http://localhost:9000/app/login", { waitUntil: "domcontentloaded" })
  await admin.waitForSelector("input[name=email], input[type=email]", { timeout: 30000 })
  await admin.fill("input[name=email], input[type=email]", "admin@example.com")
  await admin.fill("input[type=password]", "admin123")
  await admin.click("button[type=submit]")
  await admin.waitForTimeout(6000)
  console.log("NATIVE ADMIN URL:", admin.url())

  await admin.goto("http://localhost:9000/app/kinguin", { waitUntil: "domcontentloaded" })
  await admin.waitForTimeout(6000)
  const body = await admin.locator("body").innerText().catch(() => "")
  console.log("KINGUIN PAGE URL:", admin.url())
  console.log("KINGUIN PAGE TEXT:", body.replace(/\s+/g, " ").slice(0, 600))
  console.log("NATIVE 404s/errors:", JSON.stringify([...new Set(adminHttp)].slice(0, 10), null, 2))
  console.log("NATIVE CONSOLE:", JSON.stringify([...new Set(adminErrors)].slice(0, 6), null, 2))

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
