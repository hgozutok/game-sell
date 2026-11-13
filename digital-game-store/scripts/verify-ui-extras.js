const { chromium } = require("playwright")

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newContext().then((c) => c.newPage())

  // 404 sayfasi
  const res = await page.goto("http://localhost:3000/boyle-bir-sayfa-yok", {
    waitUntil: "domcontentloaded",
  })
  console.log("404 STATUS:", res.status())
  console.log("404 TEXT:", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200))

  // WhatsApp butonu
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3000)
  const wa = page.locator('button[aria-label="WhatsApp ile iletisime gec"]')
  console.log("WA BUTTON COUNT:", await wa.count())
  if (await wa.count()) {
    await wa.click()
    await page.waitForTimeout(600)
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ")
    console.log("WA MODAL:", body.includes("WhatsApp'ta yaz") ? "OK" : "YOK")
    const href = await page.locator('a:has-text("WhatsApp\'ta yaz")').getAttribute("href")
    console.log("WA LINK:", href)
  }

  await browser.close()
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
