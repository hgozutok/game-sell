# Ödeme Sistemi Kurulum Rehberi / Payment System Setup Guide

## 📋 Genel Bakış / Overview

Bu proje 3 farklı ödeme yöntemi destekler:
This project supports 3 different payment methods:

1. **PayPal** - PayPal hesabı ile ödeme
2. **Mollie** - iDEAL, Bancontact ve diğer Avrupa ödeme yöntemleri  
3. **Bank Transfer** - Manuel banka havalesi (UK)

## ⚙️ Kurulum / Setup

### 1. PayPal Entegrasyonu

#### API Bilgilerini Alın / Get API Credentials:
1. [PayPal Developer](https://developer.paypal.com/) hesabı oluşturun
2. **My Apps & Credentials** bölümüne gidin
3. **Create App** butonuna tıklayın
4. **Client ID** ve **Secret** bilgilerini kopyalayın

#### .env Dosyasına Ekleyin / Add to .env:
```bash
PAYPAL_CLIENT_ID=your_actual_client_id
PAYPAL_CLIENT_SECRET=your_actual_client_secret
PAYPAL_SANDBOX=true  # Production için false yapın
```

#### Test için Sandbox Hesapları:
- [PayPal Sandbox](https://developer.paypal.com/dashboard/accounts) - Test alıcı/satıcı hesapları oluşturun

---

### 2. Mollie Entegrasyonu

#### API Anahtarı Alın / Get API Key:
1. [Mollie Dashboard](https://www.mollie.com/dashboard/) hesabı oluşturun
2. **Developers** → **API keys** bölümüne gidin
3. **Live API key** veya **Test API key** kopyalayın

#### .env Dosyasına Ekleyin / Add to .env:
```bash
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxx  # Test için
# veya
MOLLIE_API_KEY=live_xxxxxxxxxxxxxxxxxx  # Production için
```

#### Desteklenen Ödeme Yöntemleri:
- iDEAL (Hollanda)
- Bancontact (Belçika)
- SEPA Direct Debit
- Credit Card
- PayPal
- Apple Pay
- ve daha fazlası

---

### 3. Bank Transfer (Manuel)

Bu ödeme yöntemi otomatik olarak aktiftir ve yapılandırma gerektirmez.

**Admin panelinden manuel onay gerektirir:**
1. Müşteri siparişi tamamlar ve banka bilgilerini alır
2. Müşteri banka havalesi yapar
3. Admin ödemeyi doğrular: `POST /admin/bank-transfer/verify`

#### Banka Bilgilerini Özelleştirme:
`digital-game-store/src/modules/payment-providers/bank-transfer/index.ts` dosyasını düzenleyin:

```typescript
instructions: {
  bank_name: "Your Bank Name",
  account_name: "Your Business Name",
  account_number: "12345678",
  sort_code: "20-00-00",
  iban: "GB29NWBK60161331926819",
  swift: "BARCGB22",
  reference: reference,
  note: "Please include the reference number"
}
```

---

## 🚀 Sunucuyu Başlatma / Starting the Server

### 1. .env Dosyasını Oluşturun:
```bash
cd digital-game-store
cp .env.example .env
# .env dosyasını düzenleyin ve API anahtarlarınızı ekleyin
```

### 2. Sunucuyu Başlatın:
```bash
npm run dev
```

### 3. Ödeme Sağlayıcılarını Doğrulayın:
Backend başladığında terminalde şu mesajları görmelisiniz:
- ✅ PayPal provider loaded
- ✅ Mollie provider loaded  
- ✅ Bank Transfer provider loaded

---

## 🧪 Test Etme / Testing

### PayPal Test:
```bash
# Test hesabı bilgileri:
Email: sb-buyer@personal.example.com
Password: test1234
```

### Mollie Test:
```bash
# Test kartı:
Kart Numarası: 5555 5555 5555 4444
Son Kullanma: Gelecekteki herhangi bir tarih
CVV: 123
```

### Bank Transfer Test:
1. Checkout sayfasında "Bank Transfer" seçin
2. Sipariş tamamlandıktan sonra banka bilgilerini not edin
3. Admin panelden `/admin/bank-transfer/verify` ile ödemeyi onaylayın

---

## 📊 Checkout Akışı / Checkout Flow

```
1. Müşteri sepete ürün ekler
   ↓
2. /checkout sayfasına gider
   ↓
3. Fatura bilgilerini doldurur
   ↓
4. Ödeme yöntemini seçer (PayPal/Mollie/Bank Transfer)
   ↓
5. "PLACE ORDER" butonuna tıklar
   ↓
6. Backend sipariş oluşturur ve ödeme başlatır
   ↓
7. Başarılı: /checkout/success
   Başarısız: /checkout/failed
```

---

## 🔧 Sorun Giderme / Troubleshooting

### Ödeme Sağlayıcısı Yüklenmiyor:
```bash
# Backend loglarını kontrol edin:
npm run dev

# Şu mesajları görmelisiniz:
✔ Server is ready on port: 9000
```

### PayPal Sandbox Çalışmıyor:
- `PAYPAL_SANDBOX=true` olduğundan emin olun
- PayPal Developer Console'da Sandbox hesaplarını kontrol edin
- Client ID ve Secret'ın doğru olduğunu doğrulayın

### Mollie API Key Hatası:
- API anahtarının `test_` veya `live_` ile başladığından emin olun
- Mollie Dashboard'da API anahtarının etkin olduğunu kontrol edin

### Database Bağlantı Hatası:
```bash
# PostgreSQL'in çalıştığından emin olun:
# Windows:
net start postgresql-x64-14

# Database'i oluşturun:
createdb medusa-store

# Migration'ları çalıştırın:
npm run db:migrate
```

---

## 📝 Notlar / Notes

- **Production'da:** `PAYPAL_SANDBOX=false` ve gerçek API anahtarlarını kullanın
- **Güvenlik:** `.env` dosyasını asla commit etmeyin
- **Testing:** Her zaman test environment'da test edin
- **Bank Transfer:** Manuel onay gerektirir, otomatik değildir

---

## 🆘 Yardım / Help

Sorun yaşarsanız:
1. Backend loglarını kontrol edin
2. Frontend console'u kontrol edin
3. API anahtarlarının doğru olduğundan emin olun
4. `.env` dosyasının doğru konumda olduğunu kontrol edin

---

## ✅ Kontrol Listesi / Checklist

- [ ] .env dosyası oluşturuldu
- [ ] PayPal API anahtarları eklendi
- [ ] Mollie API anahtarı eklendi  
- [ ] Database bağlantısı çalışıyor
- [ ] Backend server başarıyla başladı
- [ ] Checkout sayfası yükleniyor
- [ ] Ödeme yöntemleri görünüyor
- [ ] Test ödeme başarılı

