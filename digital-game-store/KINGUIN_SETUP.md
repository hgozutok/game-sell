# Kinguin Entegrasyonu — Kurulum ve Sandbox Test Rehberi

Bu doküman Kinguin sağlayıcı modülünün (`src/modules/kinguin`) kurulumunu, sandbox'ta test akışını ve production'a (live) geçiş adımlarını açıklar.

---

## 1. Ortam Değişkenleri

```bash
# .env
KINGUIN_API_KEY=your_api_key              # Kinguin panelinden (sandbox ve prod anahtarları FARKLIDIR)
KINGUIN_BASE_URL=https://gateway.sandbox.kinguin.net/esa/api   # sandbox
# KINGUIN_BASE_URL=https://gateway.kinguin.net/esa/api         # production
KINGUIN_WEBHOOK_SECRET=your_webhook_secret

# Oyun key şifreleme anahtarı — 32 byte (64 hex). Üretim ZORUNLU:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DIGITAL_KEY_ENCRYPTION_KEY=<64-hex-karakter>

# Opsiyonel
KINGUIN_PROVIDER_CURRENCY=eur             # Kinguin maliyet para birimi (varsayılan eur)
FULFILL_MAX_RETRIES=4                     # otomatik yeniden deneme limiti
```

> `DIGITAL_KEY_ENCRYPTION_KEY` tanımlı değilse dev ortamında JWT_SECRET'ten türetilir ve uyarı loglanır; production'da hata verecek şekilde sabit bir anahtar tanımlayın. Anahtar değişirse eski key'ler **çözülemez** — yedekleyin.

## 2. Ayağa Kaldırma

```bash
docker compose up -d          # postgres + redis
npm run dev                   # medusa develop (http://localhost:9000, admin: /app)
cd ../storefront && npm run dev   # http://localhost:3000
```

Migration'lar (kinguin, audit-log, user-preferences vb.) ilk açılışta uygulanır; elle çalıştırmak için:

```bash
npx medusa db:migrate
```

## 3. Sandbox Test Akışı (önerilen sıra)

Modül **para güvenliği için varsayılan `order_mode=readonly`** ile başlar: ödenen siparişlerde Kinguin'e gerçek sipariş **gitmez**, "onay bekliyor" kuyruğuna düşer.

1. **Katalog içe aktarımı** — Admin → *Kinguin Katalog* → ara/filtrele → "Mağazada listele" (veya toplu seçip listele). Fiyatlar fiyat motoruyla hesaplanır: `maliyet (EUR) → kur → marj kuralı → .99 yuvarlama → min-kâr guard`.
2. **Fiyat kuralları** — Admin → *Kinguin Ayarlar* → Fiyatlandırma: varsayılan marj, platform/tür bazlı kurallar (`/admin/pricing-rules`), yuvarlama, min kâr. "Fiyat önizleme" ile örnek hesaplayın.
3. **Senkron ayarları** — periyot (15dk–24s), fiyat/stok/bilgi senkronu, stok 0'da gizle, otomatik yeniden fiyatlama ve max fiyat değişim eşiği (üzeri → admin onayı).
4. **Test ödemesi** — storefront'da sepete ekleyip checkout yapın (bank-transfer ile manuel ödeme en güvenlisidir). Sipariş `awaiting_provider_mode` durumuna düşer (readonly).
5. **Manuel onay** — Admin → *Kinguin Siparişler / Fulfillment kuyruğu* → siparişi onaylayın. Readonly modda onay yine de Kinguin siparişi oluşturmaz — `order_mode=live` gerekir (aşağıda).
6. **Bakiye kontrolü** — Admin → *Kinguin* → bakiye (`GET /admin/kinguin/balance`). Min bakiye eşiği altındaysa otomatik fulfill durur, admin bildirimi düşer.
7. **Live'a geçiş** — Admin → *Kinguin Ayarlar* → "Canliya gec" (çift onay sorar). Bu adım **denetim kaydına** yazılır (`settings.update`, diff ile). Artık `auto_fulfill_enabled=true` ise ödeme sonrası Kinguin siparişi otomatik oluşur.

### Sandbox sipariş testi (admin)

`KINGUIN_SANDBOX_API_KEY` tanımlıysa **Admin → Sipariş Kontrol → sipariş detayı → 🧪 Kinguin Sandbox Testi** butonu, siparişin Kinguin ürünlerini sandbox ortamında test siparişi olarak oluşturur ve dönen test anahtarlarını gösterir. Üretim API'sine veya gerçek bakiyeye dokunmaz. Anahtar tanımlı değilse buton "sandbox anahtarı tanımlı değil" uyarısı verir; production anahtarı sandbox gateway'de 401 döner.

## 4. Fulfillment Akışı

```
order.placed (subscriber: src/subscribers/order-placed.ts)
  ├─ auto_fulfill_enabled=false → awaiting_approval (manuel kuyruk)
  ├─ order_mode!=live           → awaiting_provider_mode
  └─ else → fulfill-kinguin-order workflow (src/workflows/fulfill-kinguin-order.ts)
        bakiye kontrolü → maliyet/stok doğrulama → Kinguin siparişi (idempotency: medusa_order_id kilidi)
        → key'leri çek → AES-256-GCM şifrele → e-posta + hesap sayfası → order fulfilled
Hata → retry (max FULFILL_MAX_RETRIES) → sonra failed/manuel kuyruk
```

`fulfillment_state` değerleri (order.metadata):

| Değer | Anlamı |
|---|---|
| `pending_fulfillment` | workflow çalışıyor |
| `retrying` | geçici hata, job yeniden deneyecek (`src/jobs/retry-fulfillments.ts`) |
| `failed` | deneme limiti doldu |
| `awaiting_approval` | manuel onay bekliyor |
| `awaiting_provider_mode` | readonly mod — canlıya geçmek admin onayı |

## 5. Webhook

`POST /hooks/kinguin/kinguin` (store endpoint'leri `/hooks`, admin `/webhooks` — `src/api/webhooks/kinguin/route.ts`). İmza `KINGUIN_WEBHOOK_SECRET` ile doğrulanır. Olaylar: sipariş durumu, key teslimi, ürün güncellemesi.

## 6. Testler

```bash
npx jest src/modules/kinguin src/utils/__tests__   # mock'lu birim testler (API anahtarı gerekmez)
```

Kapsam: API client retry/hata sınıflandırma, ürün eşleme, AES-256-GCM şifreleme, fiyat motoru (marj önceliği, yuvarlama, min-kâr guard).

## 7. Sorun Giderme

- **Senkron logları**: Admin → Kinguin → SyncLog (`sync_log` tablosu; eklenen/güncellenen/hata sayıları).
- **Audit log**: Admin → *Kinguin Ayarlar* → Audit log sekmesi (`audit_log` tablosu; tüm ayar değişiklikleri `from→to` diff'i ile).
- **Key görünmüyor**: `fulfillment_state`'i ve `kinguin_order.keys_encrypted` alanını kontrol edin; `DIGITAL_KEY_ENCRYPTION_KEY` değişmişse eski kayıtlar çözülemez.
- **429 / rate limit**: client exponential backoff yapar (1s/2s/4s, `Retry-After` destekli); kalıcıysa senkron periyodunu artırın.
- **Zarar guard'ı**: satış fiyatı ≤ maliyet×(1+min_kâr) ise ürün otomatik listelenmez/yayından kalkar (`stop_on_negative_margin`).
