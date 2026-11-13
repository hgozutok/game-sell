const BASE = "http://localhost:9000"

const CASES = [
  ["DELETE", "/admin/products/prod_doesnotexist", undefined],
  ["DELETE", "/admin/digital-keys/key_doesnotexist", undefined],
  ["DELETE", "/admin/slider/slide_doesnotexist", undefined],
  ["DELETE", "/admin/pricing-rules/rule_doesnotexist", undefined],
  ["POST", "/admin/slider", {}],
  ["POST", "/admin/pricing-rules", {}],
  ["POST", "/admin/payment-settings", {}],
  ["POST", "/admin/currency", {}],
  ["POST", "/admin/settings", {}],
  ["POST", "/admin/settings/tax", {}],
  ["POST", "/admin/settings/tax/countries", {}],
  ["POST", "/admin/settings/provider-currency", {}],
  ["POST", "/admin/products/import", {}],
  ["POST", "/admin/products/import-background", {}],
  ["GET", "/admin/products/search?q=fifa", undefined],
  ["GET", "/admin/jobs/doesnotexist", undefined],
  ["GET", "/admin/order-control?limit=1", undefined],
  ["GET", "/admin/digital-keys?limit=1", undefined],
]

async function login() {
  const res = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(`login failed ${res.status}`)
  return j.token
}

async function main() {
  const token = await login()
  for (const [method, path, body] of CASES) {
    const started = Date.now()
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      const isHtml = text.trim().startsWith("<!DOCTYPE")
      console.log(
        `${String(res.status).padEnd(4)} ${String(Date.now() - started).padStart(6)}ms ${method} ${path}` +
          (isHtml ? "  [ROTA YOK]" : `  ${text.slice(0, 120).replace(/\s+/g, " ")}`)
      )
    } catch (e) {
      console.log(`ERR  ${method} ${path} -> ${e.message}`)
    }
  }
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
