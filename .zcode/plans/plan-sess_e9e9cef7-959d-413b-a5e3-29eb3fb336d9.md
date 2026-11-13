# Kalan Eksiklerin Tamamlanması — Plan

## Context
Repo, spesifikasyonun 1–6. maddelerini (Kinguin module, sync + fiyat motoru, admin UI, fulfillment workflow + webhook, storefront çekirdeği) zaten içeriyor ve her iki proje `tsc --noEmit`'ten temiz geçiyor. Kalan 5 eksik: SEO, i18n (hafif toggle kararı alındı), Kinguin client birim testleri, audit log ve güncel README. Bu plan yalnızca bu boşlukları doldurur; çalışan kodu yeniden yazmaz.

## 1. SEO (storefront)
- **Yeni** `storefront/src/app/sitemap.ts` (server): `fetch(MEDUSA_BACKEND_URL/store/products?limit=1000...)` ile tüm aktif ürünlerin handle'larını çeker, statik rotalarla birleştirir. Aynı şekilde koleksiyonlar.
- **Yeni** `storefront/src/app/robots.ts`: `Sitemap` işaretli, env'den site URL'si (`NEXT_PUBLIC_SITE_URL`, yoksa localhost).
- **Düzenle** `storefront/src/app/products/[slug]/page.tsx`: ürün yüklenince `<script type="application/ld+json">` (Product schema: name, image, description, offers.price/priceCurrency/availability) DOM'a eklenir; `document.title` + meta description da ürün verisinden set edilir (client-side, refactor yok).
- **Düzenle** `storefront/next.config` düzeltmesi gerekmez (sitemap/robots App Router natif).

## 2. i18n TR/EN — hafif toggle
- **Yeni** `storefront/src/lib/i18n.ts`: `tr`/`en` sözlükleri + `t(key)` fonksiyonu.
- **Yeni** `storefront/src/components/LanguageSwitcher.tsx` + `storefront/src/lib/language-store.ts` (zustand + localStorage persist, mevcut `useCurrencyStore` deseni).
- Header'a switcher eklenir; çevrilir: header/nav, ana sayfa, katalog filtreleri, ürün detay, sepet, checkout, hesap/key sayfaları, footer. Kapsam: UI metinleri (ürün adları/açıklamalar API verisi olduğu için olduğu gibi kalır).

## 3. Kinguin client birim testleri (digital-game-store)
Jest zaten kurulu (ts-jest, `src/**/__tests__`). Mevcut `KinguinService.request()` + axios instance mocklanabilir:
- **Yeni** `src/modules/kinguin/__tests__/service.spec.ts`:
  - `jest.mock("axios")` → `client_.request` mock: listProducts/getProduct/getBalance/getOrderKeys/createOrder happy path
  - retry: 429 → `KinguinRateLimitError` sınıflandırması, exponential delay (jest fake timers), 401→Auth, 404→NotFound, 402/insufficient balance → `KinguinInsufficientBalanceError`
  - `mapProduct` alan eşlemesi, `iterateProducts` sayfalama
- **Yeni** `src/utils/__tests__/key-crypto.spec.ts`: AES-256-GCM encrypt/decrypt roundtrip, yanlış anahtar → throw, ciphertext'te düz key yok.
- **Yeni** `src/utils/__tests__/price-engine.spec.ts`: marj %/sabit, kural önceliği (ürün > tür > platform > global), yuvarlama (.99), min-kâr guard, satış < maliyet → override engeli, kur dönüşümü.
- Hedef: `npx jest src/modules/kinguin src/utils` yeşil.

## 4. Audit log (digital-game-store)
- **Yeni modül** `src/modules/audit-log/`: model `AuditLog` (id, actor_id, actor_email, action, entity, entity_id, diff JSONB, ip, created_at) + `service.ts` (`log()` helper) + migration + `medusa-config.ts` modül kaydı (mevcut `notification-logger` deseni aynen izlenir).
- Enstrümantasyon (her dosyada 2–3 satır): `src/api/admin/kinguin/settings/route.ts` (settings update), `pricing-rules/route.ts` + `[id]/route.ts`, `fulfillment-queue/approve|reject/route.ts`, `sync-now/route.ts`, `orders/*/fulfill/route.ts`.
- **Yeni** `src/api/admin/audit-logs/route.ts` (listeleme, admin-only) + admin UI'da Kinguin ayar sayfasına "Audit Log" sekmesi (`src/admin/routes/kinguin/settings/page.tsx`).

## 5. README / sandbox dokümanı
- **Yeni** `digital-game-store/KINGUIN_SETUP.md`: env değişkenleri, sandbox canlıya alma sırası (readonly→live), sandbox'ta test siparişi adımları (import → fiyat kuralları → test ödemesi → manuel onay → live), webhook imza doğrulama kurulumu, sorun giderme (SyncLog, fulfillment_state değerleri tablosu).
- **Düzenle** kök `README.md`: yeni dosyaya bağlantı.

## Sıra ve Doğrulama
1. SEO → 2. i18n → 3. testler → 4. audit log → 5. doküman.
Her adım sonrası: `npx tsc --noEmit` (her iki proje), adım 3 sonrası `npx jest`. Testler mock'lu olduğu için Kinguin API anahtarı gerekmez.

Varsayımlar (açıkça): site URL'si `NEXT_PUBLIC_SITE_URL` env'sinden; sitemap Medusa Store API'den server-side fetch ile üretilir (publishable key header'ı ile); i18n URL yapısını değiştirmez.