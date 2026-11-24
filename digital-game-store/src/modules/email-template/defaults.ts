/**
 * Varsayilan e-posta sablonlari (EN + TR + DE + FR + AR).
 * `{{degisken}}` yer tutuculari admin panelden duzenlenebilir.
 * `*_html` ile biten yer tutucular ham HTML olarak yerlestirilir.
 *
 * Dil tespit edilemezse Ingilizce (en) kullanilir.
 */

import type { EmailLocale } from "./locales"
import { EMAIL_LOCALE_META, SUPPORTED_EMAIL_LOCALES } from "./locales"

type Locale = EmailLocale

const FOOTER: Record<Locale, string> = {
  en: `This email was sent by {{store_name}}. For questions, contact
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`,
  tr: `Bu e-posta {{store_name}} tarafından gönderildi. Sorularınız için
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`,
  de: `Diese E-Mail wurde von {{store_name}} gesendet. Bei Fragen wenden Sie sich bitte an
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`,
  fr: `Cet e-mail a été envoyé par {{store_name}}. Pour toute question, contactez
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`,
  ar: `تم إرسال هذا البريد الإلكتروني من {{store_name}}. للاستفسارات، تواصل مع
         <a href="mailto:{{support_email}}" style="color:#ff6b35;text-decoration:none;">{{support_email}}</a>`,
}

function layout(locale: Locale, title: string, content: string): string {
  const { dir, intlLocale } = EMAIL_LOCALE_META[locale]
  const align = dir === "rtl" ? "right" : "left"

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Language" content="${locale}" />
  <title>${title}</title>
</head>
<body dir="${dir}" style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Tahoma,Helvetica,sans-serif;color:#1f2430;direction:${dir};text-align:${align};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="background:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ee;text-align:${align};">
          <tr>
            <td style="background:#15171c;padding:24px 28px;text-align:${align};">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.3px;">{{store_name}}</div>
              <div style="font-size:12px;color:#ff6b35;font-weight:700;margin-top:4px;">DIGITAL GAME STORE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;text-align:${align};">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8f9fb;border-top:1px solid #e6e8ee;font-size:12px;color:#6b7280;text-align:${align};">
              ${FOOTER[locale]}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!-- locale: ${locale}; intl: ${intlLocale} -->
</body>
</html>`
}

interface VerifyCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  button: string
  fallback: string
}

const VERIFY: Record<Locale, VerifyCopy> = {
  en: {
    name: "Email Verification",
    subject: "{{store_name}} — Verify your email",
    title: "Email verification",
    heading: "Verify your email",
    body: `Hi {{first_name}}, click the button below to activate your {{store_name}} account.
     The link is valid for {{expires_hours}} hours.`,
    button: "Verify my email",
    fallback: "If the button doesn't work, copy this address into your browser:",
  },
  tr: {
    name: "E-posta Doğrulama",
    subject: "{{store_name}} — E-posta doğrulama",
    title: "E-posta doğrulama",
    heading: "E-postanızı doğrulayın",
    body: `Merhaba {{first_name}}, {{store_name}} hesabınızı etkinleştirmek için aşağıdaki butona tıklayın.
     Bağlantı {{expires_hours}} saat geçerlidir.`,
    button: "E-postamı Doğrula",
    fallback: "Buton çalışmıyorsa bu adresi tarayıcınıza kopyalayın:",
  },
  de: {
    name: "E-Mail-Bestätigung",
    subject: "{{store_name}} — Bestätigen Sie Ihre E-Mail",
    title: "E-Mail-Bestätigung",
    heading: "Bestätigen Sie Ihre E-Mail-Adresse",
    body: `Hallo {{first_name}}, klicken Sie auf die Schaltfläche unten, um Ihr {{store_name}}-Konto zu aktivieren.
     Der Link ist {{expires_hours}} Stunden gültig.`,
    button: "E-Mail bestätigen",
    fallback: "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:",
  },
  fr: {
    name: "Vérification de l’e-mail",
    subject: "{{store_name}} — Vérifiez votre e-mail",
    title: "Vérification de l’e-mail",
    heading: "Vérifiez votre adresse e-mail",
    body: `Bonjour {{first_name}}, cliquez sur le bouton ci-dessous pour activer votre compte {{store_name}}.
     Le lien est valable {{expires_hours}} heures.`,
    button: "Vérifier mon e-mail",
    fallback: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
  },
  ar: {
    name: "التحقق من البريد الإلكتروني",
    subject: "{{store_name}} — تحقق من بريدك الإلكتروني",
    title: "التحقق من البريد الإلكتروني",
    heading: "تحقق من بريدك الإلكتروني",
    body: `مرحبًا {{first_name}}، اضغط على الزر أدناه لتفعيل حسابك في {{store_name}}.
     الرابط صالح لمدة {{expires_hours}} ساعة.`,
    button: "تحقق من بريدي الإلكتروني",
    fallback: "إذا لم يعمل الزر، فانسخ هذا العنوان والصقه في متصفحك:",
  },
}

function verifyEmail(locale: Locale): string {
  const copy = VERIFY[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <p style="margin:0 0 20px;">
     <a href="{{verification_url}}" style="display:inline-block;background:#ff6b35;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:bold;text-decoration:none;">${copy.button}</a>
   </p>
   <p style="margin:0;font-size:13px;color:#6b7280;">${copy.fallback}<br/>{{verification_url}}</p>`
  )
}

interface ResetPasswordCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  button: string
  fallback: string
}

const RESET_PASSWORD: Record<Locale, ResetPasswordCopy> = {
  en: {
    name: "Password Reset",
    subject: "{{store_name}} — Reset your password",
    title: "Password reset",
    heading: "Reset your password",
    body: `Hi {{first_name}}, click the button below to set a new password for your {{store_name}} account.
     The link is valid for {{expires_hours}} hour.`,
    button: "Reset Password",
    fallback: "If the button doesn't work, copy this address into your browser:",
  },
  tr: {
    name: "Şifre Sıfırlama",
    subject: "{{store_name}} — Şifrenizi sıfırlayın",
    title: "Şifre sıfırlama",
    heading: "Şifrenizi sıfırlayın",
    body: `Merhaba {{first_name}}, {{store_name}} hesabınız için yeni bir şifre belirlemek üzere aşağıdaki butona tıklayın.
     Bağlantı {{expires_hours}} saat geçerlidir.`,
    button: "Şifremi Sıfırla",
    fallback: "Buton çalışmıyorsa bu adresi tarayıcınıza kopyalayın:",
  },
  de: {
    name: "Passwort zurücksetzen",
    subject: "{{store_name}} — Passwort zurücksetzen",
    title: "Passwort zurücksetzen",
    heading: "Setzen Sie Ihr Passwort zurück",
    body: `Hallo {{first_name}}, klicken Sie auf die Schaltfläche unten, um ein neues Passwort für Ihr {{store_name}}-Konto festzulegen.
     Der Link ist {{expires_hours}} Stunde gültig.`,
    button: "Passwort zurücksetzen",
    fallback: "Wenn die Schaltfläche nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:",
  },
  fr: {
    name: "Réinitialisation du mot de passe",
    subject: "{{store_name}} — Réinitialisez votre mot de passe",
    title: "Réinitialisation du mot de passe",
    heading: "Réinitialisez votre mot de passe",
    body: `Bonjour {{first_name}}, cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe pour votre compte {{store_name}}.
     Le lien est valable {{expires_hours}} heure.`,
    button: "Réinitialiser le mot de passe",
    fallback: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
  },
  ar: {
    name: "إعادة تعيين كلمة المرور",
    subject: "{{store_name}} — إعادة تعيين كلمة المرور",
    title: "إعادة تعيين كلمة المرور",
    heading: "إعادة تعيين كلمة المرور",
    body: `مرحبًا {{first_name}}، اضغط على الزر أدناه لتعيين كلمة مرور جديدة لحسابك في {{store_name}}.
     الرابط صالح لمدة {{expires_hours}} ساعة.`,
    button: "إعادة تعيين كلمة المرور",
    fallback: "إذا لم يعمل الزر، فانسخ هذا العنوان والصقه في متصفحك:",
  },
}

function resetPasswordEmail(locale: Locale): string {
  const copy = RESET_PASSWORD[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <p style="margin:0 0 20px;">
     <a href="{{reset_url}}" style="display:inline-block;background:#ff6b35;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:bold;text-decoration:none;">${copy.button}</a>
   </p>
   <p style="margin:0;font-size:13px;color:#6b7280;">${copy.fallback}<br/>{{reset_url}}</p>`
  )
}

interface OrderKeysCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  activate: string
  help: string
}

const ORDER_KEYS: Record<Locale, OrderKeysCopy> = {
  en: {
    name: "Digital Key Delivery",
    subject: "Your keys are ready — Order #{{order_number}}",
    title: "Your digital keys are ready",
    heading: "Your keys are ready! 🎮",
    body: `Hi {{customer_name}}, here are the digital keys for order <strong>#{{order_number}}</strong>.`,
    activate: "Activate your keys on the relevant platform (Steam, Epic, PlayStation, etc.) and start playing.",
    help: "If you need help, reply to this email or contact {{support_email}}.",
  },
  tr: {
    name: "Dijital Anahtar Teslimi",
    subject: "Anahtarlarınız hazır — Sipariş #{{order_number}}",
    title: "Dijital anahtarlarınız hazır",
    heading: "Anahtarlarınız hazır! 🎮",
    body: `Merhaba {{customer_name}}, <strong>#{{order_number}}</strong> numaralı siparişinizin dijital anahtarları aşağıdadır.`,
    activate: "Anahtarları ilgili platformda (Steam, Epic, PlayStation vb.) etkinleştirerek oynamaya başlayabilirsiniz.",
    help: "Sorun yaşarsanız bu e-postayı yanıtlayın veya {{support_email}} adresine yazın.",
  },
  de: {
    name: "Digitale Schlüsselzustellung",
    subject: "Ihre Schlüssel sind bereit — Bestellung #{{order_number}}",
    title: "Ihre digitalen Schlüssel sind bereit",
    heading: "Ihre Schlüssel sind bereit! 🎮",
    body: `Hallo {{customer_name}}, hier sind die digitalen Schlüssel für Ihre Bestellung <strong>#{{order_number}}</strong>.`,
    activate: "Aktivieren Sie Ihre Schlüssel auf der entsprechenden Plattform (Steam, Epic, PlayStation usw.) und legen Sie los.",
    help: "Wenn Sie Hilfe benötigen, antworten Sie auf diese E-Mail oder wenden Sie sich an {{support_email}}.",
  },
  fr: {
    name: "Livraison des clés numériques",
    subject: "Vos clés sont prêtes — Commande n°{{order_number}}",
    title: "Vos clés numériques sont prêtes",
    heading: "Vos clés sont prêtes ! 🎮",
    body: `Bonjour {{customer_name}}, voici les clés numériques de votre commande <strong>n°{{order_number}}</strong>.`,
    activate: "Activez vos clés sur la plateforme concernée (Steam, Epic, PlayStation, etc.) et commencez à jouer.",
    help: "Si vous avez besoin d’aide, répondez à cet e-mail ou contactez {{support_email}}.",
  },
  ar: {
    name: "تسليم المفاتيح الرقمية",
    subject: "مفاتيحك جاهزة — الطلب رقم {{order_number}}",
    title: "مفاتيحك الرقمية جاهزة",
    heading: "مفاتيحك جاهزة! 🎮",
    body: `مرحبًا {{customer_name}}، هذه هي المفاتيح الرقمية لطلبك <strong>رقم {{order_number}}</strong>.`,
    activate: "فعّل مفاتيحك على المنصة المعنية (Steam وEpic وPlayStation وغيرها) وابدأ اللعب.",
    help: "إذا كنت بحاجة إلى مساعدة، فارد على هذا البريد الإلكتروني أو تواصل مع {{support_email}}.",
  },
}

function orderDigitalKeys(locale: Locale): string {
  const copy = ORDER_KEYS[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   {{keys_html}}
   <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#374151;">
     ${copy.activate}
   </p>
   <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
     ${copy.help}
   </p>`
  )
}

interface OrderConfirmationCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  total: string
}

const ORDER_CONFIRMATION: Record<Locale, OrderConfirmationCopy> = {
  en: {
    name: "Order Confirmation",
    subject: "Order received — #{{order_number}}",
    title: "Your order has been received",
    heading: "Order received ✅",
    body: `Hi {{customer_name}}, your order <strong>#{{order_number}}</strong> has been created.
     Once your payment is approved, your keys will be sent in a separate email.`,
    total: "Total",
  },
  tr: {
    name: "Sipariş Onayı",
    subject: "Siparişiniz alındı — #{{order_number}}",
    title: "Siparişiniz alındı",
    heading: "Siparişiniz alındı ✅",
    body: `Merhaba {{customer_name}}, <strong>#{{order_number}}</strong> numaralı siparişiniz oluşturuldu.
     Ödemeniz onaylandığında anahtarlarınız ayrı bir e-postayla gönderilecek.`,
    total: "Toplam",
  },
  de: {
    name: "Bestellbestätigung",
    subject: "Bestellung erhalten — #{{order_number}}",
    title: "Ihre Bestellung ist eingegangen",
    heading: "Bestellung erhalten ✅",
    body: `Hallo {{customer_name}}, Ihre Bestellung <strong>#{{order_number}}</strong> wurde erstellt.
     Sobald Ihre Zahlung bestätigt ist, senden wir Ihre Schlüssel in einer separaten E-Mail.`,
    total: "Gesamt",
  },
  fr: {
    name: "Confirmation de commande",
    subject: "Commande reçue — n°{{order_number}}",
    title: "Votre commande a bien été reçue",
    heading: "Commande reçue ✅",
    body: `Bonjour {{customer_name}}, votre commande <strong>n°{{order_number}}</strong> a été créée.
     Dès que votre paiement sera confirmé, vos clés vous seront envoyées dans un e-mail séparé.`,
    total: "Total",
  },
  ar: {
    name: "تأكيد الطلب",
    subject: "تم استلام طلبك — رقم {{order_number}}",
    title: "تم استلام طلبك",
    heading: "تم استلام الطلب ✅",
    body: `مرحبًا {{customer_name}}، تم إنشاء طلبك <strong>رقم {{order_number}}</strong>.
     بعد تأكيد الدفع، سنرسل مفاتيحك في رسالة بريد إلكتروني منفصلة.`,
    total: "الإجمالي",
  },
}

function orderConfirmation(locale: Locale): string {
  const copy = ORDER_CONFIRMATION[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   {{items_html}}
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e6e8ee;">
     <tr>
       <td style="padding:10px 0;font-size:14px;color:#6b7280;">${copy.total}</td>
       <td style="padding:10px 0;font-size:16px;font-weight:700;text-align:${EMAIL_LOCALE_META[locale].dir === "rtl" ? "left" : "right"};color:#111827;">{{total}}</td>
     </tr>
   </table>`
  )
}

interface ContactCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  subjectLabel: string
}

const CONTACT: Record<Locale, ContactCopy> = {
  en: {
    name: "Contact Form",
    subject: "New message: {{subject}}",
    title: "New contact message",
    heading: "New contact message",
    body: `Sent by <strong>{{name}}</strong> ({{email}}).`,
    subjectLabel: "Subject",
  },
  tr: {
    name: "İletişim Formu",
    subject: "Yeni mesaj: {{subject}}",
    title: "Yeni iletişim mesajı",
    heading: "Yeni iletişim mesajı",
    body: `<strong>{{name}}</strong> ({{email}}) tarafından gönderildi.`,
    subjectLabel: "Konu",
  },
  de: {
    name: "Kontaktformular",
    subject: "Neue Nachricht: {{subject}}",
    title: "Neue Kontaktnachricht",
    heading: "Neue Kontaktnachricht",
    body: `Gesendet von <strong>{{name}}</strong> ({{email}}).`,
    subjectLabel: "Betreff",
  },
  fr: {
    name: "Formulaire de contact",
    subject: "Nouveau message : {{subject}}",
    title: "Nouveau message de contact",
    heading: "Nouveau message de contact",
    body: `Envoyé par <strong>{{name}}</strong> ({{email}}).`,
    subjectLabel: "Objet",
  },
  ar: {
    name: "نموذج الاتصال",
    subject: "رسالة جديدة: {{subject}}",
    title: "رسالة اتصال جديدة",
    heading: "رسالة اتصال جديدة",
    body: `أُرسلت من <strong>{{name}}</strong> ({{email}}).`,
    subjectLabel: "الموضوع",
  },
}

function contactForm(locale: Locale): string {
  const copy = CONTACT[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e6e8ee;border-radius:8px;">
     <tr>
       <td style="padding:16px;font-size:14px;line-height:1.7;color:#374151;">
         <div style="font-weight:700;margin-bottom:8px;">${copy.subjectLabel}: {{subject}}</div>
         {{message}}
       </td>
     </tr>
   </table>`
  )
}

interface SmtpTestCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  sentAt: string
}

const SMTP_TEST: Record<Locale, SmtpTestCopy> = {
  en: {
    name: "SMTP Test",
    subject: "SMTP test — {{store_name}}",
    title: "SMTP test",
    heading: "SMTP test successful 🎉",
    body: "This email was sent using the SMTP settings configured in the {{store_name}} admin panel.",
    sentAt: "Sent at",
  },
  tr: {
    name: "SMTP Testi",
    subject: "SMTP testi — {{store_name}}",
    title: "SMTP testi",
    heading: "SMTP testi başarılı 🎉",
    body: "Bu e-posta {{store_name}} yönetim panelindeki SMTP ayarları kullanılarak gönderildi.",
    sentAt: "Gönderim zamanı",
  },
  de: {
    name: "SMTP-Test",
    subject: "SMTP-Test — {{store_name}}",
    title: "SMTP-Test",
    heading: "SMTP-Test erfolgreich 🎉",
    body: "Diese E-Mail wurde mit den SMTP-Einstellungen im Adminbereich von {{store_name}} gesendet.",
    sentAt: "Gesendet am",
  },
  fr: {
    name: "Test SMTP",
    subject: "Test SMTP — {{store_name}}",
    title: "Test SMTP",
    heading: "Test SMTP réussi 🎉",
    body: "Cet e-mail a été envoyé à l’aide des paramètres SMTP configurés dans le panneau d’administration de {{store_name}}.",
    sentAt: "Envoyé le",
  },
  ar: {
    name: "اختبار SMTP",
    subject: "اختبار SMTP — {{store_name}}",
    title: "اختبار SMTP",
    heading: "نجح اختبار SMTP 🎉",
    body: "تم إرسال هذا البريد الإلكتروني باستخدام إعدادات SMTP في لوحة إدارة {{store_name}}.",
    sentAt: "وقت الإرسال",
  },
}

function smtpTest(locale: Locale): string {
  const copy = SMTP_TEST[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <p style="margin:0;font-size:13px;color:#6b7280;">${copy.sentAt}: {{now}}</p>`
  )
}

export interface DefaultEmailTemplate {
  key: string
  locale: Locale
  name: string
  subject: string
  html: string
  text: string | null
  active: boolean
}

function build(
  key: string,
  copy: Record<Locale, { name: string; subject: string }>,
  html: (locale: Locale) => string
): DefaultEmailTemplate[] {
  return SUPPORTED_EMAIL_LOCALES.map((locale) => ({
    key,
    locale,
    name: copy[locale].name,
    subject: copy[locale].subject,
    html: html(locale),
    text: null,
    active: true,
  }))
}

interface AdminNewUserCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
}

const ADMIN_NEW_USER: Record<Locale, AdminNewUserCopy> = {
  en: {
    name: "New User Registration (Admin)",
    subject: "[Admin] New User Registered: {{customer_name}} ({{customer_email}})",
    title: "New User Registered",
    heading: "New User Registration 👤",
    body: "A new user has registered on the store.",
  },
  tr: {
    name: "Yeni Kullanıcı Bildirimi (Admin)",
    subject: "[Admin] Yeni Kullanıcı Kaydı: {{customer_name}} ({{customer_email}})",
    title: "Yeni Kullanıcı Kaydı",
    heading: "Yeni Kullanıcı Kaydı 👤",
    body: "Mağazaya yeni bir kullanıcı kayıt oldu.",
  },
  de: {
    name: "Neuer Benutzer (Admin)",
    subject: "[Admin] Neuer Benutzer registriert: {{customer_name}} ({{customer_email}})",
    title: "Neuer Benutzer registriert",
    heading: "Neue Benutzerregistrierung 👤",
    body: "Ein neuer Benutzer hat sich registriert.",
  },
  fr: {
    name: "Nouvel utilisateur (Admin)",
    subject: "[Admin] Nouvel utilisateur inscrit : {{customer_name}} ({{customer_email}})",
    title: "Nouvel utilisateur",
    heading: "Nouvel utilisateur inscrit 👤",
    body: "Un nouvel utilisateur s'est inscrit.",
  },
  ar: {
    name: "مستخدم جديد (المشرف)",
    subject: "[المشرف] تسجيل مستخدم جديد: {{customer_name}} ({{customer_email}})",
    title: "تسجيل مستخدم جديد",
    heading: "تسجيل مستخدم جديد 👤",
    body: "تم تسجيل مستخدم جديد في المتجر.",
  },
}

function adminNewUser(locale: Locale): string {
  const copy = ADMIN_NEW_USER[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:8px;border-collapse:separate;overflow:hidden;margin:12px 0 16px;">
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;width:140px;border-bottom:1px solid #e6e8ee;">Ad Soyad:</td><td style="padding:10px 14px;font-size:14px;color:#111827;font-weight:700;border-bottom:1px solid #e6e8ee;">{{customer_name}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">E-posta:</td><td style="padding:10px 14px;font-size:14px;color:#111827;border-bottom:1px solid #e6e8ee;"><a href="mailto:{{customer_email}}" style="color:#ff6b35;">{{customer_email}}</a></td></tr>
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Kayıt Tarihi:</td><td style="padding:10px 14px;font-size:14px;color:#111827;border-bottom:1px solid #e6e8ee;">{{registration_date}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;">Doğrulama Durumu:</td><td style="padding:10px 14px;font-size:14px;color:#f59e0b;font-weight:600;">{{verification_status}}</td></tr>
   </table>`
  )
}

interface AdminNewOrderCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
}

const ADMIN_NEW_ORDER: Record<Locale, AdminNewOrderCopy> = {
  en: {
    name: "New Order Notification (Admin)",
    subject: "[Admin] New Order: #{{order_number}} — {{total}} ({{customer_name}})",
    title: "New Order Received",
    heading: "New Order Received 🛒",
    body: "A new order has been placed on {{store_name}}.",
  },
  tr: {
    name: "Yeni Sipariş Bildirimi (Admin)",
    subject: "[Admin] Yeni Sipariş: #{{order_number}} — {{total}} ({{customer_name}})",
    title: "Yeni Sipariş Alındı",
    heading: "Yeni Sipariş Alındı 🛒",
    body: "{{store_name}} mağazasında yeni bir sipariş oluşturuldu.",
  },
  de: {
    name: "Neue Bestellung (Admin)",
    subject: "[Admin] Neue Bestellung: #{{order_number}} — {{total}} ({{customer_name}})",
    title: "Neue Bestellung erhalten",
    heading: "Neue Bestellung erhalten 🛒",
    body: "Eine neue Bestellung wurde aufgegeben.",
  },
  fr: {
    name: "Nouvelle commande (Admin)",
    subject: "[Admin] Nouvelle commande : n°{{order_number}} — {{total}} ({{customer_name}})",
    title: "Nouvelle commande reçue",
    heading: "Nouvelle commande reçue 🛒",
    body: "Une nouvelle commande a été passée.",
  },
  ar: {
    name: "طلب جديد (المشرف)",
    subject: "[المشرف] طلب جديد: رقم {{order_number}} — {{total}} ({{customer_name}})",
    title: "تم استلام طلب جديد",
    heading: "تم استلام طلب جديد 🛒",
    body: "تم إنشاء طلب جديد في المتجر.",
  },
}

function adminNewOrder(locale: Locale): string {
  const copy = ADMIN_NEW_ORDER[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:8px;border-collapse:separate;overflow:hidden;margin:12px 0 16px;">
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;width:140px;border-bottom:1px solid #e6e8ee;">Sipariş No:</td><td style="padding:10px 14px;font-size:14px;color:#111827;font-weight:700;border-bottom:1px solid #e6e8ee;">#{{order_number}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Müşteri:</td><td style="padding:10px 14px;font-size:14px;color:#111827;border-bottom:1px solid #e6e8ee;">{{customer_name}} ({{customer_email}})</td></tr>
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Ödeme Yöntemi:</td><td style="padding:10px 14px;font-size:14px;color:#111827;border-bottom:1px solid #e6e8ee;">{{payment_method}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;">Toplam Tutar:</td><td style="padding:10px 14px;font-size:16px;color:#10b981;font-weight:700;">{{total}}</td></tr>
   </table>
   <h2 style="margin:16px 0 8px;font-size:16px;color:#111827;">Sipariş Edilen Ürünler:</h2>
   {{items_html}}`
  )
}

interface AdminKeysDeliveredCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
}

const ADMIN_KEYS_DELIVERED: Record<Locale, AdminKeysDeliveredCopy> = {
  en: {
    name: "Keys Delivered Report (Admin)",
    subject: "[Admin] Keys Delivered: #{{order_number}} ({{customer_name}})",
    title: "Keys Delivered",
    heading: "Keys Delivered Report 🔑",
    body: "Digital keys have been successfully delivered for order #{{order_number}}.",
  },
  tr: {
    name: "Key Teslimat Raporu (Admin)",
    subject: "[Admin] Anahtarlar Teslim Edildi: #{{order_number}} ({{customer_name}})",
    title: "Anahtarlar Teslim Edildi",
    heading: "Anahtar Teslimat Raporu 🔑",
    body: "#{{order_number}} numaralı sipariş için lisans anahtarları müşteriye başarıyla iletildi.",
  },
  de: {
    name: "Schlüssel geliefert (Admin)",
    subject: "[Admin] Schlüssel geliefert: #{{order_number}} ({{customer_name}})",
    title: "Schlüssel geliefert",
    heading: "Schlüssel-Lieferbericht 🔑",
    body: "Die Schlüssel für Bestellung #{{order_number}} wurden geliefert.",
  },
  fr: {
    name: "Clés livrées (Admin)",
    subject: "[Admin] Clés livrées : n°{{order_number}} ({{customer_name}})",
    title: "Clés livrées",
    heading: "Rapport de livraison de clés 🔑",
    body: "Les clés pour la commande n°{{order_number}} ont été livrées.",
  },
  ar: {
    name: "تم تسليم المفاتيح (المشرف)",
    subject: "[المشرف] تم تسليم المفاتيح: رقم {{order_number}} ({{customer_name}})",
    title: "تم تسليم المفاتيح",
    heading: "تقرير تسليم المفاتيح 🔑",
    body: "تم تسليم المفاتيح الرقمية بنجاح للطلب رقم {{order_number}}.",
  },
}

function adminKeysDelivered(locale: Locale): string {
  const copy = ADMIN_KEYS_DELIVERED[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:8px;border-collapse:separate;overflow:hidden;margin:12px 0 16px;">
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;width:140px;border-bottom:1px solid #e6e8ee;">Sipariş No:</td><td style="padding:10px 14px;font-size:14px;color:#111827;font-weight:700;border-bottom:1px solid #e6e8ee;">#{{order_number}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Alıcı E-posta:</td><td style="padding:10px 14px;font-size:14px;color:#111827;border-bottom:1px solid #e6e8ee;">{{customer_email}}</td></tr>
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;">Teslim Zamanı:</td><td style="padding:10px 14px;font-size:14px;color:#111827;">{{now}}</td></tr>
   </table>
   <h2 style="margin:16px 0 8px;font-size:16px;color:#111827;">Teslim Edilen Lisans Anahtarları:</h2>
   {{keys_html}}`
  )
}

interface OrderBankTransferCopy {
  name: string
  subject: string
  title: string
  heading: string
  body: string
  note: string
}

const ORDER_BANK_TRANSFER: Record<Locale, OrderBankTransferCopy> = {
  en: {
    name: "Bank Transfer Instructions",
    subject: "{{store_name}} — Payment instructions for Order #{{order_number}}",
    title: "Bank Transfer Instructions",
    heading: "Bank Transfer Details 🏦",
    body: "Hi {{customer_name}}, thank you for your order. Please transfer the total amount to our bank account below:",
    note: "Important: Please include only your reference code in the bank transfer description so we can verify your payment automatically.",
  },
  tr: {
    name: "Banka Havalesi / EFT Talimatı",
    subject: "{{store_name}} — Sipariş #{{order_number}} için Havale / EFT Bilgileri",
    title: "Havale / EFT Bilgileri",
    heading: "Havale / EFT ile Ödeme Bilgileri 🏦",
    body: "Merhaba {{customer_name}}, siparişiniz oluşturuldu. Lütfen sipariş tutarını aşağıdaki banka hesabımıza gönderiniz:",
    note: "Önemli: Ödemenizin otomatik eşleşebilmesi için havale/EFT açıklama kısmına yalnızca referans kodunuzu yazınız.",
  },
  de: {
    name: "Banküberweisung",
    subject: "{{store_name}} — Zahlungsanweisungen für Bestellung #{{order_number}}",
    title: "Banküberweisung",
    heading: "Banküberweisungsdaten 🏦",
    body: "Hallo {{customer_name}}, bitte überweisen Sie den Betrag auf unser Bankkonto:",
    note: "Wichtig: Bitte geben Sie als Verwendungszweck nur Ihren Referenzcode an.",
  },
  fr: {
    name: "Virement bancaire",
    subject: "{{store_name}} — Instructions de paiement pour la commande n°{{order_number}}",
    title: "Virement bancaire",
    heading: "Instructions de virement bancaire 🏦",
    body: "Bonjour {{customer_name}}, veuillez effectuer le virement sur notre compte bancaire :",
    note: "Important : Veuillez indiquer uniquement votre code de référence dans le libellé du virement.",
  },
  ar: {
    name: "التحويل البنكي",
    subject: "{{store_name}} — تعليمات الدفع للطلب رقم {{order_number}}",
    title: "تعليمات التحويل البنكي",
    heading: "تفاصيل التحويل البنكي 🏦",
    body: "مرحبًا {{customer_name}}، يُرجى تحويل إجمالي المبلغ إلى حسابنا البنكي أدناه:",
    note: "هام: يُرجى كتابة رمز المرجع فقط في خانة وصف التحويل البنكي.",
  },
}

function orderBankTransfer(locale: Locale): string {
  const copy = ORDER_BANK_TRANSFER[locale]
  return layout(
    locale,
    copy.title,
    `<h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${copy.heading}</h1>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
     ${copy.body}
   </p>
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:8px;border-collapse:separate;overflow:hidden;margin:12px 0 16px;">
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;width:140px;border-bottom:1px solid #e6e8ee;">Sipariş No:</td><td style="padding:10px 14px;font-size:14px;color:#111827;font-weight:700;border-bottom:1px solid #e6e8ee;">#{{order_number}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Ödenecek Tutar:</td><td style="padding:10px 14px;font-size:16px;color:#10b981;font-weight:700;border-bottom:1px solid #e6e8ee;">{{total}}</td></tr>
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Banka Adı:</td><td style="padding:10px 14px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #e6e8ee;">{{bank_name}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">Hesap Sahibi:</td><td style="padding:10px 14px;font-size:14px;color:#111827;border-bottom:1px solid #e6e8ee;">{{account_name}}</td></tr>
     <tr style="background:#f8f9fb;"><td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #e6e8ee;">IBAN:</td><td style="padding:10px 14px;font-size:14px;color:#111827;font-family:monospace;font-weight:700;border-bottom:1px solid #e6e8ee;">{{iban}}</td></tr>
     <tr><td style="padding:10px 14px;font-size:13px;color:#6b7280;background:#fff8f0;">Açıklama (Referans):</td><td style="padding:10px 14px;font-size:16px;color:#ff6b35;font-weight:800;background:#fff8f0;font-family:monospace;">{{payment_reference}}</td></tr>
   </table>
   <div style="padding:12px 16px;background:#fff8f0;border-left:4px solid #ff6b35;border-radius:4px;font-size:13px;color:#9a3412;line-height:1.5;">
     ${copy.note}
   </div>`
  )
}

const ADMIN_NEW_USER_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: ADMIN_NEW_USER[locale].name, subject: ADMIN_NEW_USER[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const ADMIN_NEW_ORDER_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: ADMIN_NEW_ORDER[locale].name, subject: ADMIN_NEW_ORDER[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const ADMIN_KEYS_DELIVERED_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: ADMIN_KEYS_DELIVERED[locale].name, subject: ADMIN_KEYS_DELIVERED[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const ORDER_BANK_TRANSFER_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: ORDER_BANK_TRANSFER[locale].name, subject: ORDER_BANK_TRANSFER[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const ORDER_KEYS_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: ORDER_KEYS[locale].name, subject: ORDER_KEYS[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const ORDER_CONFIRMATION_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: ORDER_CONFIRMATION[locale].name, subject: ORDER_CONFIRMATION[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const CONTACT_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: CONTACT[locale].name, subject: CONTACT[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const SMTP_TEST_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: SMTP_TEST[locale].name, subject: SMTP_TEST[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const VERIFY_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: VERIFY[locale].name, subject: VERIFY[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

const RESET_PASSWORD_COPY = Object.fromEntries(
  SUPPORTED_EMAIL_LOCALES.map((locale) => [
    locale,
    { name: RESET_PASSWORD[locale].name, subject: RESET_PASSWORD[locale].subject },
  ])
) as Record<Locale, { name: string; subject: string }>

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  ...build("verify-email", VERIFY_COPY, verifyEmail),
  ...build("reset-password", RESET_PASSWORD_COPY, resetPasswordEmail),
  ...build("order-digital-keys", ORDER_KEYS_COPY, orderDigitalKeys),
  ...build("order-confirmation", ORDER_CONFIRMATION_COPY, orderConfirmation),
  ...build("order-bank-transfer", ORDER_BANK_TRANSFER_COPY, orderBankTransfer),
  ...build("admin-new-user", ADMIN_NEW_USER_COPY, adminNewUser),
  ...build("admin-new-order", ADMIN_NEW_ORDER_COPY, adminNewOrder),
  ...build("admin-keys-delivered", ADMIN_KEYS_DELIVERED_COPY, adminKeysDelivered),
  ...build("contact-form", CONTACT_COPY, contactForm),
  ...build("smtp-test", SMTP_TEST_COPY, smtpTest),
]
