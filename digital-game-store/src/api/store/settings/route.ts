import type { MedusaRequest, MedusaResponse} from '@medusajs/framework/http'

/**
 * Get public store settings (theme, currencies, etc.)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
    }
    const storeSettingsModule = req.scope.resolve('storeSettings') as any

    const themeSettings = await storeSettingsModule.getThemeSettings()
    const enabledCurrencies = await storeSettingsModule.getSettingValue('currencies.enabled', ['USD', 'EUR', 'GBP'])
    const defaultCurrency = await storeSettingsModule.getSettingValue('currencies.default', 'USD')
    const displayCurrency = await storeSettingsModule.getSettingValue('store.display_currency', defaultCurrency)
    const taxRate = await storeSettingsModule.getSettingValue('tax.rate', 20)
    const storeName = await storeSettingsModule.getSettingValue('store.name', 'Digital Game Store')
    const storeDescription = await storeSettingsModule.getSettingValue(
      'store.description',
      'Your trusted marketplace for digital game keys'
    )
    const whatsappNumber = await storeSettingsModule.getSettingValue('store.whatsapp_number', '')
    const whatsappMessage = await storeSettingsModule.getSettingValue(
      'store.whatsapp_message',
      'Merhaba, bir urun hakkinda bilgi almak istiyorum.'
    )
    // Listeleme ust fiyat limiti (EUR). 0 = sinirsiz. Varsayilan 100 EUR.
    const maxPriceEur = await storeSettingsModule.getSettingValue('catalog.max_price_eur', 100)
    const cartMaxTotalEur = await storeSettingsModule.getSettingValue('cart.max_total_eur', 0)
    const supportEmail = await storeSettingsModule.getSettingValue(
      'store.support_email',
      'support@digitalgamestore.com'
    )
    const logoUrl = await storeSettingsModule.getSettingValue('store.logo_url', '')

    // Sosyal medya baglantilari (admin panelden yonetilir, bos olanlar gizlenir)
    const socialValue = async (key: string) => {
      const value = await storeSettingsModule.getSettingValue(key, '')
      return typeof value === 'string' ? value.trim() : ''
    }
    const social = {
      facebook: await socialValue('store.social.facebook'),
      instagram: await socialValue('store.social.instagram'),
      x: await socialValue('store.social.x'),
      linkedin: await socialValue('store.social.linkedin'),
      youtube: await socialValue('store.social.youtube'),
    }

    // Ust duyuru seridi: admin panelden duzenlenir, kapatilirsa hic gosterilmez.
    const announcementEnabled = await storeSettingsModule.getSettingValue(
      'store.announcement.enabled',
      true
    )
    const announcementText = async (key: string) => {
      const value = await storeSettingsModule.getSettingValue(key, '')
      return typeof value === 'string' ? value.trim() : ''
    }
    const announcement = {
      enabled: announcementEnabled !== false,
      texts: {
        en: await announcementText('store.announcement.en'),
        tr: await announcementText('store.announcement.tr'),
        de: await announcementText('store.announcement.de'),
        fr: await announcementText('store.announcement.fr'),
        ar: await announcementText('store.announcement.ar'),
      },
    }

    // Odeme saglayici ayarlari (admin panelden yonetilir)
    const settingsValue = async (key: string, fallback = '') => {
      const value = await storeSettingsModule.getSettingValue(key, fallback)
      return value ?? fallback
    }

    const stripePublishableKey = await settingsValue(
      'payment.stripe.publishable_key',
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    )

    const bankTransfer = {
      bank_name: await settingsValue('payment.bank_transfer.bank_name', 'Barclays Bank UK'),
      account_name: await settingsValue('payment.bank_transfer.account_name', 'Digital Game Store Ltd'),
      iban: await settingsValue('payment.bank_transfer.iban', 'GB29NWBK60161331926819'),
      account_number: await settingsValue('payment.bank_transfer.account_number', '12345678'),
      sort_code: await settingsValue('payment.bank_transfer.sort_code', '20-00-00'),
      swift: await settingsValue('payment.bank_transfer.swift', 'BARCGB22'),
      note: await settingsValue(
        'payment.bank_transfer.note',
        'Please include the reference number in your payment description'
      ),
    }

    res.json({
      theme: themeSettings,
      currencies: {
        enabled: enabledCurrencies,
        default: defaultCurrency,
        display: displayCurrency,
      },
      store: {
        name: storeName,
        description: storeDescription,
        support_email: supportEmail,
        logo_url: logoUrl || '',
        whatsapp_number: whatsappNumber || '',
        whatsapp_message: whatsappMessage || '',
        social,
        announcement,
      },
      taxes: {
        rate: typeof taxRate === 'number' ? taxRate : parseFloat(taxRate) || 0,
      },
      catalog: {
        max_price_eur: Number(maxPriceEur) || 0,
      },
      cart: {
        max_total_eur: Number(cartMaxTotalEur) || 0,
      },
      payments: {
        stripe_publishable_key: stripePublishableKey,
        bank_transfer: bankTransfer,
      },
    })
  } catch (error: any) {
    console.error('Settings GET error:', error)
    // Return default settings if error
    res.json({
      theme: {
        headerBgColor: '#15171c',
        primaryColor: '#ff6b35',
        secondaryColor: '#f7931e',
      },
      currencies: {
        enabled: ['USD'],
        default: 'USD',
        display: 'USD',
      },
      store: {
        name: 'Digital Game Store',
        description: 'Your trusted marketplace for digital game keys',
        support_email: 'support@digitalgamestore.com',
        logo_url: '',
        whatsapp_number: '',
        whatsapp_message: '',
        social: {
          facebook: '',
          instagram: '',
          x: '',
          linkedin: '',
          youtube: '',
        },
      },
      taxes: {
        rate: 0,
      },
      catalog: {
        max_price_eur: 100,
      },
      cart: {
        max_total_eur: 0,
      },
      payments: {
        stripe_publishable_key: '',
        bank_transfer: {
          bank_name: 'Barclays Bank UK',
          account_name: 'Digital Game Store Ltd',
          iban: 'GB29NWBK60161331926819',
          account_number: '12345678',
          sort_code: '20-00-00',
          swift: 'BARCGB22',
          note: 'Please include the reference number in your payment description',
        },
      },
    })
  }
}
