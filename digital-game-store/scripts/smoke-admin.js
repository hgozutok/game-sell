const BASE = "http://localhost:9000"

const GETS = [
  "/admin/products?limit=2",
  "/admin/orders?limit=2",
  "/admin/order-control?limit=2",
  "/admin/digital-keys?limit=2",
  "/admin/payment-settings",
  "/admin/settings?category=general",
  "/admin/settings/currency_rates",
  "/admin/settings/provider-currency",
  "/admin/settings/tax/countries",
  "/admin/slider",
  "/admin/pricing-rules",
  "/admin/currency",
  "/admin/sync-logs?limit=2",
  "/admin/audit-logs?limit=2",
  "/admin/kinguin/balance",
  "/admin/kinguin/settings",
  "/admin/kinguin/sync-logs?limit=2",
  "/admin/kinguin/fulfillment-queue",
  "/admin/kinguin/price-approvals",
]

const POSTS = [
  ["/admin/kinguin/price-preview", { cost_minor: 1000, platform: "Steam" }],
]

async function login() {
  const res = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(`login failed ${res.status}: ${JSON.stringify(j)}`)
  return j.token
}

async function call(method, path, token, body) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 90000)
  const started = Date.now()
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const text = await res.text()
    return { path, method, status: res.status, ms: Date.now() - started, snippet: text.slice(0, 220) }
  } catch (e) {
    return { path, method, status: "ERR", ms: Date.now() - started, snippet: String(e.message || e) }
  } finally {
    clearTimeout(t)
  }
}

async function main() {
  const token = await login()
  const results = []
  for (const p of GETS) results.push(await call("GET", p, token))
  for (const [p, b] of POSTS) results.push(await call("POST", p, token, b))
  for (const r of results) {
    const flag = r.status === 200 ? "OK  " : "FAIL"
    console.log(`${flag} ${String(r.status).padEnd(3)} ${String(r.ms).padStart(6)}ms  ${r.method} ${r.path}`)
    if (r.status !== 200) console.log(`      -> ${r.snippet.replace(/\s+/g, " ")}`)
  }
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
