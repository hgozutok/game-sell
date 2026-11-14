# Güvenlik Denetimi — Cart & Ödeme (2026-11-14)

Kapsam: localhost dev ortamı (backend :9000, storefront :3000). Statik kod incelemesi + aktif black-box testler.
Test notu: Denetim sırasında oluşturulan `sectest-a@example.com` / `sectest-b@example.com` müşterileri test artefaktıdır; test siparişi oluşturulamadı (fiyat çözümlemesi 400 döndü). Sipariş #7'nin durumu değişmedi (zaten onaylıydı).

## KRİTİK

### C1 — 41 custom admin route'da auth bilerek kapalı (`AUTHENTICATE = false`)
`src/api/admin/**` altındaki 41 route dosyasında "Disable auth for development" notuyla auth kapatılmış.
Aktif olarak doğrulananlar (yetkisiz, hiçbir token olmadan):
- `GET /admin/digital-keys` → **gerçek key kodları** (key_code, customer_id, order_id, status) sızıyor
- `GET /admin/order-control` → tüm sipariş verisi
- `POST /admin/order-control/:id/approve` → **"Ödeme onaylandı"** — yetkisiz sipariş/ödeme onayı
- `GET /admin/settings`, `/admin/debug-collections`, `/admin/products` (+import, fix-prices, sync-collections), `/admin/pricing-rules`, `/admin/currency`, `/admin/payment-settings`, `/admin/email-settings`, `/admin/slider`, `/admin/jobs/:id`, `/admin/kinguin-return-keys*`, `/admin/kinguin-sandbox-test`
- Korunanlar: core `/admin/*`, `kinguin/products|settings|sync-*, orders/*, bank-transfer/verify, audit-logs, settings/[key]|logo`

**Sömürü zinciri (kanıtlandı):** `POST /store/orders/create` (guest) → bank-transfer otomatik "authorized" → yetkisiz `POST /admin/order-control/:id/approve` → auto-fulfill açıkken key teslimi. Para girmeden key sızar.
**Çözüm:** Tüm admin route'larından `export const AUTHENTICATE = false` satırlarını sil. `/admin/*` custom route'ları varsayılan olarak admin auth'a düşer (korunan route'lar kanıtlıyor). Prod'a çıkmadan önce zorunlu.

### C2 — Üç custom ödeme sağlayıcısı koşulsuz "authorized" dönüyor
`bank-transfer`, `paypal`, `mollie` provider'larının `authorizePayment`'ı hiçbir doğrulama yapmadan `status: "authorized"` döndürüyor → cart completion her koşulda sipariş üretir. bank-transfer yorumunda "sandbox" yazıyor ama canlı moda geçiş koruması yok (paypal/mollie'de sandbox notu bile yok).
**Çözüm:** authorizePayment gerçek gateway durumunu sorgulamalı; bank-transfer "pending" döndürüp capture'ı `/admin/bank-transfer/verify` ile yapmalı. Sandbox davranışı `order_mode` gibi bir ayara bağlanmalı.

### C3 — `/store/orders/create` tamamen yetkisiz (AUTHENTICATE=false)
- Herhangi bir e-posta ile sipariş açılır; `listCustomers({ email })` ile **başkasının e-postasına sipariş bağlanır** → onay e-postaları/havale talimatlarıyla spam/phishing aracı, müşteri sayım/enumerasyon.
- Miktar üst sınırı yok (`quantity` sadece min 1'e clamp'leniyor).
- Rate limit yok.
**Çözüm:** Publishable key zorunlu kıl, origin allowlist, rate limit, quantity üst sınırı (ör. 10), müşteri zaten varsa e-posta doğrulaması olmadan sipariş bağlamayı engelle.

### C4 — CORS: rastgele Origin yansıtma + credentials
`orders/create`, `orders/complete`, `cart/preview` gelen `Origin` header'ını allowlist'siz yansıtıp `Access-Control-Allow-Credentials: true` gönderiyor → herhangi bir site kimlikli cross-origin istek yapıp yanıtı okuyabilir.
**Çözüm:** `STORE_CORS` listesindeki origin'lerle sınırla.

## YÜKSEK

### H1 — Custom auth: düz metin şifre
`/store/auth/register` şifreyi `customer.metadata.password_hash`'e **hash'siz** kaydediyor; `/store/auth/login` düz karşılaştırma yapıp yanıt olarak `metadata`'yı (şifre dahil)客户 a geri döndürüyor. Storefront'un canlı login yolu bu (`src/lib/auth.ts`).
Not: Medusa'nın kendi `/auth/customer/emailpass` JWT'si `/store/customers/me`'de 401 dönüyor (Bearer ve cookie) — müşteri JWT auth'ı projede çalışmıyor; bu yüzden custom auth yazılmış. Kök nedeni çözüp Medusa auth'a geçmek doğru yol.
Custom login'in base64 `customerId:timestamp` token'ı imzasız — backend kabul etmiyor (fail-closed ✓) ama hiçbir makul amaç için kullanılmamalı.

### H2 — `/store/orders/complete` ödeme doğrulaması yapmadan sipariş tamamlıyor
`cart_id` alan kartın ödeme durumu hiç kontrol edilmeden `completeCartWorkflow` çalıştırılıyor. C2'deki koşulsuz authorize ile birleşince onaysız ödemeyle sipariş üretilir. (Testte: stripe kartı için `requires_action` dönüşü sonrası complete çağrısı C2 yüzünden ayrışamadı — endpoint'in kendisi kilit kontrolü yapmıyor, koda bakıldı.)

## ORTA

- **M1** `/store/cart/preview` fiyatı istemciden alıyor (storefront sepet/checkout GÖRÜNTÜLEME için kullanıyor). Şu an ödeme tutarına karışmıyor (orders/create sunucu tarafı fiyatlamayı kullanıyor ✓) ama ileride ödemeye bağlanırsa tutar uyuşmazlığı. Ayrıca preview'da price-set fiyatları hiç çözümlenemiyor (no-price → total 0) — fonksiyonel hata.
- **M2** `/admin/bank-transfer/verify` stub — "Payment verified and captured" dönüyor ama capture kodu yorumda; admin'i yanıltır.
- **M3** 500 yanıtlarında `error.stack` dönüyor (orders/create) — bilgi sızıntısı.
- **M4** Auth/login/register/order uçlarında rate limiting yok.
- **M5** `POST /admin/jobs/:id` yetkisiz → Kinguin API kotası/sync istismarı.

## ÇALIŞAN KONTROLLER ✓
- Core admin route'lar 401; kinguin yönetim route'ları korumalı; yanlış secret'la Kinguin webhook 401 (timing-safe karşılaştırma)
- `/store/orders/:id/digital-keys` ve `/store/customers/me/digital-keys` sahiplik kontrolü içeriyor (customer_id eşleşmesi; 401/403 fail-closed)
- Sahte (imzasız) custom token backend'de kabul edilmiyor
- orders/create tutarları sunucuda hesaplıyor — istemci fiyatı yok sayılıyor
- IDOR: B kullanıcısının A'nın sipariş key'lerine erişimi 401/403 (auth çözümlenemediği için fail-closed)

## Öncelik sırası
1. C1: `AUTHENTICATE = false` satırlarını kaldır (tek satırlık mekanik düzeltme, en büyük kazanım)
2. C2: provider authorize'larını gerçek doğrulamaya bağla
3. C3+C4: orders/create'a key/origin/rate-limit/quantity sınırları
4. H1: Medusa auth'a geçiş, metadata şifresini kaldır (mevcut şifreler zaten düz metin — kullanıcı başına reset gerekir)
5. H2/M*: complete'te ödeme durumu doğrulaması, verify stub'unu tamamlama, stack temizliği, rate limit
