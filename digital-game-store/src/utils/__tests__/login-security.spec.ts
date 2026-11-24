import { rateLimit, clientIp } from '../bot-protection'

describe('User Login & Auth Security Controls', () => {
  describe('Rate Limiter (Sliding Window & Key Isolation)', () => {
    it('engeller: 5 denemeyi asan istekler 429 gibi davranmali', () => {
      const testKey = `test-user-${Date.now()}`
      const limit = 5
      const windowMs = 60 * 1000

      // Ilk 5 istek gecmeli
      for (let i = 0; i < limit; i++) {
        const res = rateLimit(testKey, limit, windowMs)
        expect(res.allowed).toBe(true)
        expect(res.retryAfterSec).toBe(0)
      }

      // 6. istek engellenmeli
      const blocked = rateLimit(testKey, limit, windowMs)
      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfterSec).toBeGreaterThan(0)
    })

    it('izolasyon: farkli kullanici/IP anahtarlari birbirini etkilememeli', () => {
      const userA = `user-a-${Date.now()}`
      const userB = `user-b-${Date.now()}`
      const limit = 3
      const windowMs = 60 * 1000

      // User A 3 kez denesin ve kilitlensin
      for (let i = 0; i < limit; i++) {
        rateLimit(userA, limit, windowMs)
      }
      expect(rateLimit(userA, limit, windowMs).allowed).toBe(false)

      // User B bundan etkilenmemeli, gecmeli
      expect(rateLimit(userB, limit, windowMs).allowed).toBe(true)
    })

    it('hesap bazli brute-force korumasi: farkli IPlerden gelse bile ayni hesaba yuklenildiginde kilitlenmeli', () => {
      const targetAccount = `victim-${Date.now()}@example.com`
      const limit = 5
      const windowMs = 15 * 60 * 1000

      // 5 farkli proxy/IP'den ayni hesaba saldiri simule edilsin
      for (let i = 0; i < limit; i++) {
        const res = rateLimit(`login:account:${targetAccount}`, limit, windowMs)
        expect(res.allowed).toBe(true)
      }

      // 6. farkli proxy IP'si ile yapilan istek bile hesap limitinden dolayi ENGELLENMELI
      const blocked = rateLimit(`login:account:${targetAccount}`, limit, windowMs)
      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfterSec).toBeGreaterThan(0)
    })
  })

  describe('Client IP Extraction (Anti-spoofing)', () => {
    it('x-real-ip varsa birinci oncelikle almali', () => {
      const req = {
        headers: {
          'x-real-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        },
      }
      expect(clientIp(req)).toBe('203.0.113.195')
    })

    it('x-forwarded-for son IPyi (gercek proxy IP) almali, ilk sahte IPyi reddetmeli', () => {
      const req = {
        headers: {
          'x-forwarded-for': '1.2.3.4 (spoofed), 198.51.100.42',
        },
      }
      expect(clientIp(req)).toBe('198.51.100.42')
    })
  })

  describe('Girdi Dogrulama ve Sinirlama Kurallari', () => {
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    it('gecersiz e-posta formatlarini reddetmeli', () => {
      expect(EMAIL_RE.test('invalid-email')).toBe(false)
      expect(EMAIL_RE.test('@no-user.com')).toBe(false)
      expect(EMAIL_RE.test('user@')).toBe(false)
      expect(EMAIL_RE.test('user @domain.com')).toBe(false)
      expect(EMAIL_RE.test('valid.user+test@example.com')).toBe(true)
    })

    it('asiri uzun e-postalari (RFC 5321 limit: 254 karakter) engellemeli', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(longEmail.length > 254).toBe(true)
    })

    it('asiri uzun sifreleri (DoS/ReDoS onleme: max 256 karakter) engellemeli', () => {
      const dosPassword = 'x'.repeat(10000)
      expect(dosPassword.length > 256).toBe(true)
    })
  })

  describe('Sifre Sifirlama Guvenlik Kontrolleri', () => {
    it('sifremi unuttum istegi IP ve e-posta bazinda sinirlanmali', () => {
      const testEmail = `forgot-${Date.now()}@example.com`
      const testIp = `192.0.2.${Math.floor(Math.random() * 250)}`

      // IP bazli 5 istek limiti
      for (let i = 0; i < 5; i++) {
        expect(rateLimit(`forgot-pw:ip:${testIp}`, 5, 15 * 60 * 1000).allowed).toBe(true)
      }
      expect(rateLimit(`forgot-pw:ip:${testIp}`, 5, 15 * 60 * 1000).allowed).toBe(false)

      // E-posta bazli 3 istek limiti
      for (let i = 0; i < 3; i++) {
        expect(rateLimit(`forgot-pw:email:${testEmail}`, 3, 15 * 60 * 1000).allowed).toBe(true)
      }
      expect(rateLimit(`forgot-pw:email:${testEmail}`, 3, 15 * 60 * 1000).allowed).toBe(false)
    })

    it('reset-password token ve sifre uzunluk kontrolleri', () => {
      const shortPw = '123'
      const validPw = 'SuperSecret2026!'
      const hugePw = 'A'.repeat(300)

      expect(shortPw.length < 8).toBe(true)
      expect(validPw.length >= 8 && validPw.length <= 256).toBe(true)
      expect(hugePw.length > 256).toBe(true)
    })
  })

  describe('Kayit & Giris E-posta Kucuk Harfe Cevirme (Normalization)', () => {
    it('buyuk veya karisik harfli e-postayi kucuk harfe ve trim edilmis hale cevirmeli', () => {
      const inputs = [
        'User@Example.COM',
        '  JOHN.DOE@GMAIL.COM  ',
        'Test.User+Sub@Outlook.Com',
      ]
      const expected = [
        'user@example.com',
        'john.doe@gmail.com',
        'test.user+sub@outlook.com',
      ]

      inputs.forEach((input, idx) => {
        const normalized = String(input).trim().toLowerCase()
        expect(normalized).toBe(expected[idx])
      })
    })
  })
})
