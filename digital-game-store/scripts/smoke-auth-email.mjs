#!/usr/bin/env node
/**
 * Kayit + e-posta uctan uca duman testi.
 *
 * Kullanim (yerel):
 *   BASE_URL=http://localhost:13100 \
 *   PUBLISHABLE_KEY=pk_... \
 *   MAILPIT_URL=http://localhost:8025 \
 *   STORE_URL=http://localhost:13000 \
 *   node scripts/smoke-auth-email.mjs
 *
 * Mailpit yoksa yalnizca API akisi test edilir; dogrulama e-postasi
 * bekleniyorsa test bunu acikca bildirir ve basarisiz olur. Boylece
 * "e-posta gitti" varsayimi ile yayina cikilmaz.
 */

const BASE = (process.env.BASE_URL || "http://localhost:13100").replace(/\/+$/, "")
const PUBLISHABLE_KEY = process.env.PUBLISHABLE_KEY || ""
const MAILPIT = (process.env.MAILPIT_URL || "").replace(/\/+$/, "")
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const STAMP = Date.now()
const TEST_EMAIL = process.env.TEST_EMAIL || `smoke.${STAMP}@example.com`
const PASSWORD = process.env.TEST_PASSWORD || `Smoke-${STAMP}-Aa1!`
// Rate limit kovalari IP basina; her kosu kendi IP'sini kullanir ki tekrar
// calistirmalar birbirini 429'a dusurmesin.
const ipFor = (n) => `203.0.113.${((STAMP + n * 7) % 200) + 10}`

const results = []
let failed = 0

function ok(name, extra = "") {
  results.push({ name, ok: true })
  console.log(`PASS  ${name}${extra ? ` — ${extra}` : ""}`)
}

function fail(name, detail = "") {
  failed++
  results.push({ name, ok: false, detail })
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`)
}

function check(name, condition, detail = "") {
  if (condition) ok(name)
  else fail(name, detail)
}

async function request(path, { method = "GET", body, token, publishable = true, ip } = {}) {
  const headers = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (publishable && PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  if (token) headers.Authorization = `Bearer ${token}`
  // Rate limit testleri ayni IP kovasini paylasmasin (nginx gercek IP'yi yazar).
  if (ip) headers["x-forwarded-for"] = ip
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data, headers: res.headers }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function mailpit(path) {
  const res = await fetch(`${MAILPIT}${path}`)
  if (!res.ok) throw new Error(`Mailpit ${path} -> ${res.status}`)
  return res.json()
}

async function findMail(to, { timeoutMs = 30000 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const list = await mailpit("/api/v1/messages?limit=100")
    const messages = list.messages || []
    const hit = messages.find((m) =>
      (m.To || []).some((t) => String(t.Address).toLowerCase() === to.toLowerCase())
    )
    if (hit) {
      return mailpit(`/api/v1/message/${hit.ID}`)
    }
    await sleep(1000)
  }
  throw new Error(`Mailpit: ${to} adresine ${timeoutMs / 1000}s icinde e-posta gelmedi`)
}

function bodyOf(message) {
  return String(message.Text || message.HTML || "")
}

function extractVerificationUrl(message) {
  const body = bodyOf(message).replace(/=\r?\n/g, "")
  const match = body.match(/https?:\/\/[^\s"'<>]+\/verify-email\?token=([a-f0-9]{16,})/i)
  return match ? { url: match[0], token: match[1] } : null
}

async function main() {
  console.log(`Hedef: ${BASE}`)
  console.log(`Test e-postasi: ${TEST_EMAIL}`)
  console.log(`Mailpit: ${MAILPIT || "(yok — e-posta icerigi dogrulanmayacak)"}`)
  console.log("")

  // 1) Servis ayakta mi?
  {
    const r = await request("/health", { publishable: false })
    check("Backend /health", r.status === 200, `durum=${r.status}`)
  }

  // 2) Magaza kimligi ve dogrulama ayari
  let verificationRequired = false
  {
    const r = await request("/store/auth/providers")
    check(
      "Store auth yapilandirmasi (publishable key)",
      r.status === 200 && Array.isArray(r.data?.providers),
      `durum=${r.status} ${JSON.stringify(r.data)?.slice(0, 160)}`
    )
    verificationRequired = r.data?.email_verification_required === true
    console.log(`      e-posta dogrulamasi: ${verificationRequired ? "ACIK" : "KAPALI"}`)
  }

  // 3) Kayit
  {
    const r = await request("/store/auth/register", {
      method: "POST",
      body: {
        email: TEST_EMAIL,
        password: PASSWORD,
        first_name: "Smoke",
        last_name: "Test",
        phone: "+905550000000",
        locale: "tr",
      },
      ip: ipFor(1),
    })
    check(
      "Kullanici kaydi",
      r.status === 201 && r.data?.customer?.email === TEST_EMAIL,
      `durum=${r.status} ${JSON.stringify(r.data)?.slice(0, 220)}`
    )
    check(
      "Kayit yanitinda dogrulama durumu",
      r.status === 201 && r.data?.requires_verification === verificationRequired,
      `requires_verification=${r.data?.requires_verification} beklenen=${verificationRequired}`
    )
    check(
      "Kayit telefonu saklandi",
      r.status === 201 && r.data?.customer?.phone === "+905550000000",
      `phone=${r.data?.customer?.phone}`
    )
    check(
      "Kayit yanitinda sifre/metadata sizmasi yok",
      r.status === 201 && !("metadata" in (r.data?.customer || {})) && !("password" in (r.data || {})),
      JSON.stringify(r.data?.customer)?.slice(0, 120)
    )
  }

  // 4) Ayni e-posta ile ikinci kayit reddedilmeli
  {
    const r = await request("/store/auth/register", {
      method: "POST",
      body: {
        email: TEST_EMAIL,
        password: PASSWORD,
        first_name: "Smoke",
        last_name: "Duplicate",
      },
      ip: ipFor(2),
    })
    check("Tekrarlanan kayit reddedildi", r.status === 409, `durum=${r.status}`)
  }

  // 5) Dogrulama e-postasi
  if (verificationRequired) {
    if (!MAILPIT) {
      fail(
        "Dogrulama e-postasi",
        "SMTP acik ama MAILPIT_URL verilmedi; gonderim dogrulanamadi"
      )
    } else {
      try {
        const message = await findMail(TEST_EMAIL)
        check("Dogrulama e-postasi teslim edildi", Boolean(message?.ID), `konu=${message?.Subject}`)
        check(
          "Dogrulama e-postasi Turkce",
          /doğrula|dogrula|Hesab|Merhaba/i.test(bodyOf(message)),
          String(message?.Subject || "")
        )
        const link = extractVerificationUrl(message)
        check("Dogrulama baglantisi var", Boolean(link?.token), bodyOf(message).slice(0, 120))
        if (link?.token) {
          const v = await request("/store/auth/verify-email", {
            method: "POST",
            body: { token: link.token },
          })
          check("E-posta dogrulama", v.status === 200 && v.data?.verified === true, `durum=${v.status}`)
          const again = await request("/store/auth/verify-email", {
            method: "POST",
            body: { token: link.token },
          })
          check("Ayni token ikinci kez kullanilamiyor", again.status === 400 || again.data?.verified === true, `durum=${again.status}`)
        }
      } catch (e) {
        fail("Dogrulama e-postasi", e.message)
      }
    }
  }

  // 6) Giris + korumali musteri ucu
  let customerToken = ""
  {
    const r = await request("/store/auth/login", {
      method: "POST",
      body: { email: TEST_EMAIL, password: PASSWORD },
      ip: ipFor(3),
    })
    check("Giris", r.status === 200 && Boolean(r.data?.token), `durum=${r.status} ${JSON.stringify(r.data)?.slice(0, 160)}`)
    customerToken = r.data?.token || ""

    const me = await request("/store/customers/me", { token: customerToken })
    check(
      "Korumali /store/customers/me",
      me.status === 200 && me.data?.customer?.email === TEST_EMAIL,
      `durum=${me.status}`
    )
  }

  // 7) Yanlis sifre reddedilmeli
  {
    const r = await request("/store/auth/login", {
      method: "POST",
      body: { email: TEST_EMAIL, password: "yanlis-sifre" },
      ip: ipFor(4),
    })
    check("Yanlis sifre reddedildi", r.status === 401, `durum=${r.status}`)
  }

  // 8) Dogrulama tekrar gonderimi (enumerasyon sizdirmaz)
  {
    const r = await request("/store/auth/resend-verification", {
      method: "POST",
      body: { email: TEST_EMAIL },
      ip: ipFor(5),
    })
    check("Dogrulama tekrar gonderme", r.status === 200, `durum=${r.status}`)

    const unknown = await request("/store/auth/resend-verification", {
      method: "POST",
      body: { email: `yok.${STAMP}@example.com` },
      ip: ipFor(6),
    })
    check(
      "Bilinmeyen e-posta icin ayni yanit",
      unknown.status === 200 && unknown.data?.message === r.data?.message,
      `durum=${unknown.status}`
    )
  }

  // 9) Iletisim formu -> destek e-postasi
  if (MAILPIT) {
    try {
      const settings = await request("/store/settings")
      const support = settings.data?.store?.support_email
      if (!support) {
        console.log("SKIP  Iletisim formu — store.support_email tanimli degil")
      } else {
        const r = await request("/store/contact", {
          method: "POST",
          body: {
            name: "Smoke Test",
            email: TEST_EMAIL,
            subject: `Smoke ${STAMP}`,
            message: "Bu bir duman testi mesajidir.",
            locale: "tr",
          },
        })
        check("Iletisim formu kabul edildi", r.status === 200, `durum=${r.status} ${JSON.stringify(r.data)}`)
        const message = await findMail(support, { timeoutMs: 20000 })
        check("Iletisim e-postasi destek adresine ulasti", Boolean(message?.ID), `konu=${message?.Subject}`)
      }
    } catch (e) {
      fail("Iletisim formu", e.message)
    }
  }

  // 10) Admin uclari kimlik dogrulamasi istiyor mu? (kritik production kontrolu)
  {
    const anon = await request("/admin/email-settings", { publishable: false })
    check(
      "Admin uclari tokensiz kapali",
      anon.status === 401 || anon.status === 403,
      `durum=${anon.status} (acik ise kritik guvenlik acigi)`
    )
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const login = await request("/auth/user/emailpass", {
        method: "POST",
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        publishable: false,
      })
      const adminToken = login.data?.token
      check("Admin girisi", login.status === 200 && Boolean(adminToken), `durum=${login.status}`)
      if (adminToken) {
        const authed = await request("/admin/email-settings", { token: adminToken, publishable: false })
        check("Admin ucu token ile acik", authed.status === 200, `durum=${authed.status}`)
      }
    }
  }

  console.log("")
  const passed = results.length - failed
  console.log(`SONUC: ${passed}/${results.length} gecti, ${failed} basarisiz`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
