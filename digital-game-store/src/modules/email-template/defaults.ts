/**
 * Varsayilan e-posta sablonlari (TR + EN).
 * `{{degisken}}` yer tutuculari admin panelden duzenlenebilir.
 * `*_html` ile biten yer tutucular ham HTML olarak yerlestirilir.
 */

type Locale = "tr" | "en"

function layout(locale: Locale, title: string, content: string): string {
  const footer =
    locale === "tr"
      ? `Bu e-posta {{store_name}} tarafından gönderildi. Sorularınız için
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`
      : `This email was sent by {{store_name}}. For questions, contact
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ee;">
          <tr>
            <td style="background:#15171c;padding:24px 28px;">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.3px;">{{store_name}}</div>
              <div style="font-size:12px;color:#ff6b35;font-weight:700;margin-top:4px;">DIGITAL GAME STORE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8f9fb;border-top:1px solid #e6e8ee;font-size:12px;color:#6b7280;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const orderDigitalKeysTr = layout(
  "tr",
  "Dijital anahtarlarınız hazır",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Anahtarlarınız hazır! 🎮</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     Merhaba {{customer_name}}, <strong>#{{order_number}}</strong> numaralı siparişinizin dijital anahtarları aşağıdadır.
   </p>
   {{keys_html}}
   <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#374151;">
     Anahtarları ilgili platformda (Steam, Epic, PlayStation vb.) etkinleştirerek oynamaya başlayabilirsiniz.
   </p>
   <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
     Sorun yaşarsanız bu e-postayı yanıtlayın veya {{support_email}} adresine yazın.
   </p>`
)

const orderDigitalKeysEn = layout(
  "en",
  "Your digital keys are ready",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Your keys are ready! 🎮</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     Hi {{customer_name}}, here are the digital keys for order <strong>#{{order_number}}</strong>.
   </p>
   {{keys_html}}
   <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#374151;">
     Activate your keys on the relevant platform (Steam, Epic, PlayStation, etc.) and start playing.
   </p>
   <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
     If you need help, reply to this email or contact {{support_email}}.
   </p>`
)

const orderConfirmationTr = layout(
  "tr",
  "Siparişiniz alındı",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Siparişiniz alındı ✅</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     Merhaba {{customer_name}}, <strong>#{{order_number}}</strong> numaralı siparişiniz oluşturuldu.
     Ödemeniz onaylandığında anahtarlarınız ayrı bir e-postayla gönderilecek.
   </p>
   {{items_html}}
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e6e8ee;">
     <tr>
       <td style="padding:10px 0;font-size:14px;color:#6b7280;">Toplam</td>
       <td style="padding:10px 0;font-size:16px;font-weight:700;text-align:right;color:#111827;">{{total}}</td>
     </tr>
   </table>`
)

const orderConfirmationEn = layout(
  "en",
  "Your order has been received",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Order received ✅</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     Hi {{customer_name}}, your order <strong>#{{order_number}}</strong> has been created.
     Once your payment is approved, your keys will be sent in a separate email.
   </p>
   {{items_html}}
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e6e8ee;">
     <tr>
       <td style="padding:10px 0;font-size:14px;color:#6b7280;">Total</td>
       <td style="padding:10px 0;font-size:16px;font-weight:700;text-align:right;color:#111827;">{{total}}</td>
     </tr>
   </table>`
)

const contactFormTr = layout(
  "tr",
  "Yeni iletişim mesajı",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Yeni iletişim mesajı</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     <strong>{{name}}</strong> ({{email}}) tarafından gönderildi.
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e6e8ee;border-radius:8px;">
     <tr>
       <td style="padding:16px;font-size:14px;line-height:1.7;color:#374151;">
         <div style="font-weight:700;margin-bottom:8px;">Konu: {{subject}}</div>
         {{message}}
       </td>
     </tr>
   </table>`
)

const contactFormEn = layout(
  "en",
  "New contact message",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New contact message</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     Sent by <strong>{{name}}</strong> ({{email}}).
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e6e8ee;border-radius:8px;">
     <tr>
       <td style="padding:16px;font-size:14px;line-height:1.7;color:#374151;">
         <div style="font-weight:700;margin-bottom:8px;">Subject: {{subject}}</div>
         {{message}}
       </td>
     </tr>
   </table>`
)

const smtpTestTr = layout(
  "tr",
  "SMTP test",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">SMTP testi başarılı 🎉</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     Bu e-posta {{store_name}} yönetim panelindeki SMTP ayarları kullanılarak gönderildi.
   </p>
   <p style="margin:0;font-size:13px;color:#6b7280;">Gönderim zamanı: {{now}}</p>`
)

const smtpTestEn = layout(
  "en",
  "SMTP test",
  `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">SMTP test successful 🎉</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     This email was sent using the SMTP settings configured in the {{store_name}} admin panel.
   </p>
   <p style="margin:0;font-size:13px;color:#6b7280;">Sent at: {{now}}</p>`
)

export interface DefaultEmailTemplate {
  key: string
  locale: Locale
  name: string
  subject: string
  html: string
  text: string | null
  active: boolean
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    key: "order-digital-keys",
    locale: "tr",
    name: "Dijital Anahtar Teslimi",
    subject: "Anahtarlarınız hazır — Sipariş #{{order_number}}",
    html: orderDigitalKeysTr,
    text: null,
    active: true,
  },
  {
    key: "order-digital-keys",
    locale: "en",
    name: "Digital Key Delivery",
    subject: "Your keys are ready — Order #{{order_number}}",
    html: orderDigitalKeysEn,
    text: null,
    active: true,
  },
  {
    key: "order-confirmation",
    locale: "tr",
    name: "Sipariş Onayı",
    subject: "Siparişiniz alındı — #{{order_number}}",
    html: orderConfirmationTr,
    text: null,
    active: true,
  },
  {
    key: "order-confirmation",
    locale: "en",
    name: "Order Confirmation",
    subject: "Order received — #{{order_number}}",
    html: orderConfirmationEn,
    text: null,
    active: true,
  },
  {
    key: "contact-form",
    locale: "tr",
    name: "İletişim Formu",
    subject: "Yeni mesaj: {{subject}}",
    html: contactFormTr,
    text: null,
    active: true,
  },
  {
    key: "contact-form",
    locale: "en",
    name: "Contact Form",
    subject: "New message: {{subject}}",
    html: contactFormEn,
    text: null,
    active: true,
  },
  {
    key: "smtp-test",
    locale: "tr",
    name: "SMTP Test",
    subject: "SMTP test — {{store_name}}",
    html: smtpTestTr,
    text: null,
    active: true,
  },
  {
    key: "smtp-test",
    locale: "en",
    name: "SMTP Test",
    subject: "SMTP test — {{store_name}}",
    html: smtpTestEn,
    text: null,
    active: true,
  },
]
