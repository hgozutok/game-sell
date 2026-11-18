// Musteri yonetimi ucu + pasiflestirme akisi icin uctan uca test.
const BASE = process.env.BASE_URL || 'http://localhost:13100'
const PK = process.env.PUBLISHABLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const MAILPIT = (process.env.MAILPIT_URL || '').replace(/\/+$/, '')
const STAMP = Date.now()

let pass = 0
let fail = 0
let ipSeq = 0
function check(name, ok, detail = '') {
  if (ok) {
    pass++
    console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`)
  } else {
    fail++
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`)
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function mailpit(path) {
  const res = await fetch(`${MAILPIT}${path}`)
  if (!res.ok) throw new Error(`Mailpit ${path} -> ${res.status}`)
  return res.json()
}

async function findVerificationToken(to, { timeoutMs = 30000 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const list = await mailpit('/api/v1/messages?limit=100')
    const hit = (list.messages || []).find((m) =>
      (m.To || []).some((t) => String(t.Address).toLowerCase() === to.toLowerCase())
    )
    if (hit) {
      const message = await mailpit(`/api/v1/message/${hit.ID}`)
      const body = String(message.Text || message.HTML || '').replace(/=\r?\n/g, '')
      const match = body.match(/verify-email\?token=([a-f0-9]{16,})/i)
      if (match) return match[1]
    }
    await sleep(1000)
  }
  throw new Error(`Mailpit: ${to} adresine dogrulama e-postasi gelmedi`)
}

async function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  ipSeq++
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(PK ? { 'x-publishable-api-key': PK } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      // Rate limit kovalari IP basina; her istek kendi IP'sini kullanir.
      'x-forwarded-for': `203.0.113.${(STAMP + ipSeq * 11) % 200 + 10}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { status: res.status, data }
}

const adminLogin = await req('/auth/user/emailpass', {
  method: 'POST',
  body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
})
check('Admin girisi', adminLogin.status === 200 && Boolean(adminLogin.data?.token))
const adminToken = adminLogin.data?.token
if (!adminToken) process.exit(1)

// 1) Liste ucu
const list = await req('/admin/customer-control?limit=100', { token: adminToken })
check('Admin ucu token ile acik', list.status === 200, `status=${list.status}`)
check('Liste donuyor', Array.isArray(list.data?.customers), `count=${list.data?.count}`)
check('Ozet donuyor', typeof list.data?.summary?.total === 'number',
  `toplam=${list.data?.summary?.total} aktif=${list.data?.summary?.active} pasif=${list.data?.summary?.disabled}`)

const sample = list.data?.customers?.find((c) => c.order_count > 0)
if (sample) {
  check('Siparisi olan musteride sayi/tutar dolu',
    sample.order_count > 0 && sample.total_spent > 0,
    `${sample.email}: ${sample.order_count} siparis / ${sample.total_spent} (${sample.currency_code})`)
  check('Siparis alanlari sizmaz (metadata yok)',
    sample.metadata === undefined && sample.password_hash === undefined)
} else {
  check('Siparisi olan musteri bulundu', false, 'DB’de siparisli musteri yok')
}

// 2) Durum filtresi
const disabledList = await req('/admin/customer-control?status=disabled&limit=5', { token: adminToken })
check('Pasif filtresi calisiyor', disabledList.status === 200 && Array.isArray(disabledList.data?.customers))

// 3) Pasiflestirme akisi: yeni bir test hesabi
const ts = Date.now()
const email = `smoke.customer.${ts}@example.com`
const password = 'Customer-Smoke-123!'
const reg = await req('/store/auth/register', {
  method: 'POST',
  body: { email, password, first_name: 'Smoke', last_name: 'Customer', locale: 'tr' },
})
check('Kayit', reg.status === 201, `status=${reg.status}`)
const customerId = reg.data?.customer?.id
check('Customer id alindi', Boolean(customerId))

// Dogrulama aciksa Mailpit'teki baglanti ile hesabi dogrula.
if (reg.data?.requires_verification === true) {
  if (!MAILPIT) {
    check('Dogrulama e-postasi (Mailpit)', false, 'MAILPIT_URL verilmedi')
  } else {
    const token = await findVerificationToken(email)
    const verified = await req('/store/auth/verify-email', { method: 'POST', body: { token } })
    check('Dogrulama e-postasi + token', verified.status === 200 && verified.data?.verified === true,
      `status=${verified.status}`)
  }
}

const login1 = await req('/store/auth/login', { method: 'POST', body: { email, password } })
check('Pasiflestirme oncesi giris', login1.status === 200 && Boolean(login1.data?.token))
const customerToken = login1.data?.token

const meBefore = await req('/store/customers/me/orders', { token: customerToken })
check('Pasiflestirme oncesi /customers/me/orders', meBefore.status === 200, `status=${meBefore.status}`)

const off = await req(`/admin/customer-control/${customerId}`, {
  method: 'POST',
  token: adminToken,
  body: { active: false },
})
check('Pasiflestirildi', off.status === 200 && off.data?.customer?.active === false, `status=${off.status}`)

const login2 = await req('/store/auth/login', { method: 'POST', body: { email, password } })
check('Pasif hesap giris yapamiyor', login2.status === 403 && login2.data?.code === 'account_disabled',
  `status=${login2.status} code=${login2.data?.code}`)

const meAfter = await req('/store/customers/me/orders', { token: customerToken })
check('Mevcut oturum siparis gecmisini goremiyor',
  meAfter.status === 403 && meAfter.data?.code === 'account_disabled', `status=${meAfter.status}`)

const orderAfter = await req('/store/orders/create', {
  method: 'POST',
  token: customerToken,
  body: { cart_id: 'cart_x' },
})
check('Mevcut oturum siparis olusturamiyor', orderAfter.status === 403, `status=${orderAfter.status}`)

const listedOff = await req(`/admin/customer-control?status=disabled&q=${encodeURIComponent(email)}`, {
  token: adminToken,
})
check('Pasif hesap filtrede gorunuyor',
  (listedOff.data?.customers || []).some((c) => c.id === customerId),
  `status=${listedOff.status}`)

const on = await req(`/admin/customer-control/${customerId}`, {
  method: 'POST',
  token: adminToken,
  body: { active: true },
})
check('Aktiflestirildi', on.status === 200 && on.data?.customer?.active === true)

const login3 = await req('/store/auth/login', { method: 'POST', body: { email, password } })
check('Aktiflestirince giris yeniden calisiyor', login3.status === 200 && Boolean(login3.data?.token))

const badBody = await req(`/admin/customer-control/${customerId}`, {
  method: 'POST',
  token: adminToken,
  body: { active: 'yes' },
})
check('Gecersiz govde 400', badBody.status === 400, `status=${badBody.status}`)

const noAuth = await req('/admin/customer-control')
check('Admin ucu tokensiz kapali', noAuth.status === 401 || noAuth.status === 403, `status=${noAuth.status}`)

console.log('')
console.log(`SONUC: ${pass}/${pass + fail} gecti, ${fail} basarisiz`)
process.exit(fail === 0 ? 0 : 1)
