# Storefront i18n

Mağaza vitrini beş dilde çalışır: **İngilizce (en), Türkçe (tr), Almanca (de), Fransızca (fr), Arapça (ar)**.
Arapça sağdan sola (RTL) olarak render edilir.

## Nasıl çalışır

| Dosya | Görev |
| --- | --- |
| `src/i18n/config.ts` | Dil listesi, meta veriler, `LOCALE_COOKIE`, `matchAcceptLanguage`, `INTL_LOCALE` |
| `src/i18n/messages/*.ts` | Düz anahtar → 5 dil sözlüğü (`MessageTable`) |
| `src/i18n/messages/index.ts` | Tüm tabloları `MESSAGES` içinde birleştirir |
| `src/i18n/index.ts` | `translate()`, `formatDate()`, `formatCurrency()`, `formatNumber()` |
| `src/i18n/LocaleProvider.tsx` | İstemci bağlamı: `useTranslation()`, `useLocale()` |
| `src/i18n/server.ts` | Sunucu bileşenleri için `getServerT()`, `getServerLocale()` |
| `src/components/useT.ts` | `const t = useT()` kısayolu |
| `src/middleware.ts` | İlk ziyarette `Accept-Language`'e göre `NEXT_LOCALE` çerezini yazar |

Dil seçimi `NEXT_LOCALE` çerezinde (1 yıl) ve `localStorage`'da tutulur. Kök layout çerezi
okuyup `<html lang dir>` değerlerini ve meta verileri sunucuda üretir; dil değiştirildiğinde
`router.refresh()` sunucu bileşenlerini yeni dille yeniler.

## Kullanım

```tsx
// İstemci bileşeni
const t = useT()
t('cart.title')
t('common.item', { count: items.length })   // çoğul: "1 ürün|3 ürün"
t('catalog.pageOf', { page, total })

// Sunucu bileşeni (metadata export'u olan dosyalar)
const t = getServerT()
```

- Çoğul: sözlükte `'1 item|{count} items'` biçiminde yazılır; `count === 1` ilk parçayı seçer.
- Yer tutucu: `{count}`, `{value}`, `{date}` gibi süslü parantezler.
- Anahtar bulunamazsa anahtarın kendisi döner (genellikle İngilizce kaynak metin).

## Yeni dil eklemek

1. `Locale` birleşimine kodu ekleyin (`config.ts`).
2. `LOCALE_META` ve `INTL_LOCALE` kayıtlarını doldurun.
3. `messages/*.ts` dosyalarındaki her anahtara yeni dili ekleyin (TypeScript eksikleri yakalar).
4. `LOCALES` dizisine kodu ekleyin — dil seçici otomatik listeler.

## Yeni metin eklemek

1. Uygun `messages/<namespace>.ts` dosyasına anahtarı 5 diliyle birlikte yazın.
2. Bileşende `t('namespace.anahtar')` çağırın.
3. `npm run i18n:check` ile sözlükte eksik anahtar kalmadığını doğrulayın.

## Doğrulama

```bash
npm run i18n:check            # kodda kullanılan anahtarlar sözlükte var mı?
npm run i18n:check:rendered   # çalışan sunucuda 5 dil × sayfa taraması (lang/dir + ham anahtar sızıntısı)
```

`i18n:check:rendered` çalışan bir sunucu bekler (varsayılan `http://localhost:3101`),
argümanla başka adres verilebilir: `node scripts/check-rendered.mjs http://localhost:3000`.

## Kapsam notları

- **Üst duyuru şeridi** (`Header`) admin panelden yönetilir: *Mağaza Ayarları → Üst Duyuru Şeridi*.
  Anahtar kapatılırsa şerit hiç görünmez; bir dil alanı boş bırakılırsa o dilde `nav.banner`
  çevirisi (varsayılan metin) gösterilir. Yani metin önceliği: admin değeri → `nav.banner`.
- **Yönetim paneli** (`/admin`) Türkçe kalır; Arapça seçilse bile `dir="ltr"` olarak render edilir.
- **Blog yazılarının gövde metinleri** İngilizce yayımlanır; başlık/özet ve arayüz çevrilidir.
  Farklı dilde gezen kullanıcıya makale başında "bu makale İngilizce" notu gösterilir.
- Şirket adı, adres, e-posta, sicil/vergi numaraları ve mevzuat adları çevrilmez.
