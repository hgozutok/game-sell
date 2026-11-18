import { AbstractPaymentProvider, MedusaError } from '@medusajs/framework/utils'
import axios, { AxiosInstance } from 'axios'

/**
 * PayPal — gercek REST entegrasyonu (Orders v2).
 *
 * Onceki surum bir "stub"ti: API'ye hic gitmeden odemeyi onayli goruyordu
 * (musteri para odemeden siparis verebiliyordu). Artik:
 *   initiatePayment  -> POST /v2/checkout/orders (intent=CAPTURE)
 *   authorizePayment -> POST /v2/checkout/orders/{id}/capture
 *   capturePayment   -> ayni capture (idempotent)
 *   refundPayment    -> POST /v2/payments/captures/{captureId}/refund
 *
 * Kimlik bilgileri yoksa saglayici kaydedilmez; yine de cagrilirsa net hata verir
 * (sessizce basarili donmez).
 */

type PayPalOptions = {
  client_id?: string
  client_secret?: string
  /** 'sandbox' | 'live' */
  environment?: string
  api_base_url?: string
  webhook_id?: string
}

const SANDBOX = 'https://api-m.sandbox.paypal.com'
const LIVE = 'https://api-m.paypal.com'

export class PayPalProviderService extends AbstractPaymentProvider<PayPalOptions> {
  static identifier = 'paypal'

  protected client_: AxiosInstance
  protected clientId_: string
  protected clientSecret_: string
  protected token_: { value: string; expiresAt: number } | null = null

  constructor(cradle: Record<string, unknown> = {}, options: PayPalOptions = {}) {
    super(cradle, options)

    this.clientId_ = String(options.client_id || process.env.PAYPAL_CLIENT_ID || '')
    this.clientSecret_ = String(
      options.client_secret || process.env.PAYPAL_CLIENT_SECRET || ''
    )

    const baseUrl =
      options.api_base_url ||
      process.env.PAYPAL_API_BASE_URL ||
      (String(options.environment || process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live'
        ? LIVE
        : SANDBOX)

    this.client_ = axios.create({
      baseURL: baseUrl.replace(/\/+$/, ''),
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  static validateOptions(options: Record<string, any>): void {
    const id = options?.client_id || process.env.PAYPAL_CLIENT_ID
    const secret = options?.client_secret || process.env.PAYPAL_CLIENT_SECRET
    if (!id || !secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PayPal saglayicisi icin PAYPAL_CLIENT_ID ve PAYPAL_CLIENT_SECRET gerekli.'
      )
    }
  }

  // ---------------- yardimcilar ----------------

  private assertConfigured() {
    if (!this.clientId_ || !this.clientSecret_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PayPal yapilandirilmamis: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET eksik.'
      )
    }
  }

  private async accessToken(): Promise<string> {
    this.assertConfigured()
    if (this.token_ && this.token_.expiresAt > Date.now() + 30_000) {
      return this.token_.value
    }

    const basic = Buffer.from(`${this.clientId_}:${this.clientSecret_}`).toString('base64')
    try {
      const res = await this.client_.post(
        '/v1/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )
      const token = String(res.data?.access_token || '')
      if (!token) {
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'PayPal token alinamadi')
      }
      this.token_ = {
        value: token,
        expiresAt: Date.now() + Number(res.data?.expires_in || 300) * 1000,
      }
      return token
    } catch (e: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `PayPal kimlik dogrulama hatasi: ${this.errorText(e)}`
      )
    }
  }

  private async request<T = any>(
    method: 'get' | 'post',
    path: string,
    body?: any,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const token = await this.accessToken()
    try {
      const res = await this.client_.request<T>({
        method,
        url: path,
        data: body,
        headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
      })
      return res.data
    } catch (e: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `PayPal istegi basarisiz (${method.toUpperCase()} ${path}): ${this.errorText(e)}`
      )
    }
  }

  private errorText(e: any): string {
    const data = e?.response?.data
    const detail =
      data?.details?.[0]?.description ||
      data?.message ||
      data?.error_description ||
      data?.name ||
      e?.message ||
      'bilinmeyen hata'
    const status = e?.response?.status ? ` [${e.response.status}]` : ''
    return `${detail}${status}`
  }

  private toAmount(value: any): string {
    const n = Number(value)
    if (!Number.isFinite(n)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Gecersiz odeme tutari')
    }
    return n.toFixed(2)
  }

  // ---------------- Medusa provider sozlesmesi ----------------

  async initiatePayment(input: any): Promise<any> {
    this.assertConfigured()

    const currency = String(input.currency_code || 'USD').toUpperCase()
    const value = this.toAmount(input.amount)
    const sessionId = input?.data?.session_id || input?.context?.idempotency_key

    const order = await this.request('post', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: sessionId || undefined,
          description: 'HUPIPLAY dijital urun',
          amount: { currency_code: currency, value },
        },
      ],
      application_context: {
        brand_name: 'HUPIPLAY',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    })

    const approve = (order?.links || []).find((l: any) => l.rel === 'approve')?.href

    return {
      id: String(order.id),
      status: 'pending',
      data: {
        id: String(order.id),
        status: String(order.status || 'CREATED'),
        currency_code: currency,
        amount: value,
        approve_url: approve || null,
        session_id: sessionId || null,
      },
    }
  }

  async authorizePayment(input: any): Promise<any> {
    this.assertConfigured()
    const orderId = String(input?.data?.id || '')
    if (!orderId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'PayPal order id yok')
    }

    const current = await this.request('get', `/v2/checkout/orders/${orderId}`)
    const state = String(current?.status || '')

    if (state === 'COMPLETED') {
      return { status: 'captured', data: { ...input.data, status: state } }
    }
    if (state !== 'APPROVED') {
      // Musteri PayPal'da odemeyi henuz onaylamadi
      return { status: 'pending', data: { ...input.data, status: state } }
    }

    const captured = await this.request('post', `/v2/checkout/orders/${orderId}/capture`, {})
    const captureId =
      captured?.purchase_units?.[0]?.payments?.captures?.[0]?.id || undefined
    const finalState = String(captured?.status || '')

    return {
      status: finalState === 'COMPLETED' ? 'captured' : 'pending',
      data: {
        ...input.data,
        status: finalState,
        capture_id: captureId || null,
      },
    }
  }

  async capturePayment(input: any): Promise<any> {
    this.assertConfigured()
    const captureId = input?.data?.capture_id
    if (captureId) {
      // Zaten yakalanmis
      return { data: input.data }
    }
    const result = await this.authorizePayment(input)
    return { data: result.data }
  }

  async cancelPayment(input: any): Promise<any> {
    this.assertConfigured()
    const orderId = String(input?.data?.id || '')
    if (orderId) {
      // Yakalanmamis siparisler iptal edilebilir; hata olursa yutmayalim ama
      // siparis iptalini de engellemeyelim.
      try {
        await this.request('post', `/v2/checkout/orders/${orderId}/cancel`, {})
      } catch {
        /* PayPal tarafinda iptal edilemiyorsa yerel iptal yeterli */
      }
    }
    return { data: { ...input.data, status: 'CANCELED' } }
  }

  async deletePayment(input: any): Promise<any> {
    return { data: input?.data }
  }

  async getPaymentStatus(input: any): Promise<any> {
    this.assertConfigured()
    const orderId = String(input?.data?.id || '')
    if (!orderId) return { status: 'pending' }

    const order = await this.request('get', `/v2/checkout/orders/${orderId}`)
    switch (String(order?.status || '')) {
      case 'COMPLETED':
        return { status: 'captured', data: { ...input.data, status: 'COMPLETED' } }
      case 'APPROVED':
        return { status: 'authorized', data: { ...input.data, status: 'APPROVED' } }
      case 'VOIDED':
        return { status: 'canceled', data: { ...input.data, status: 'VOIDED' } }
      default:
        return { status: 'pending', data: { ...input.data, status: order?.status } }
    }
  }

  async refundPayment(input: any): Promise<any> {
    this.assertConfigured()
    const captureId = input?.data?.capture_id
    if (!captureId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'PayPal iadesi icin capture_id yok (odeme yakalanmamis olabilir)'
      )
    }

    const currency = String(input?.data?.currency_code || 'USD').toUpperCase()
    const body: any = {}
    if (input?.amount !== undefined && input?.amount !== null) {
      body.amount = { value: this.toAmount(input.amount), currency_code: currency }
    }

    const refund = await this.request(
      'post',
      `/v2/payments/captures/${captureId}/refund`,
      body
    )

    return {
      data: {
        ...input.data,
        status: 'REFUNDED',
        refund_id: refund?.id || null,
        refund_status: refund?.status || null,
      },
    }
  }

  async retrievePayment(input: any): Promise<any> {
    this.assertConfigured()
    const orderId = String(input?.data?.id || '')
    if (!orderId) return { data: input?.data }
    const order = await this.request('get', `/v2/checkout/orders/${orderId}`)
    return { data: { ...input.data, status: order?.status } }
  }

  async updatePayment(input: any): Promise<any> {
    // PayPal siparis tutari olusturulduktan sonra degistirilemez (PATCH ile
    // yalnizca bazi alanlar). Tutar degistiyse yeni oturum gerekir; burada
    // mevcut veriyi koruyup durumu bildiriyoruz.
    return { data: input?.data }
  }

  async getWebhookActionAndData(payload: any): Promise<any> {
    // Senkron capture akisi kullaniliyor; webhook ile otomatik tamamlama
    // istenirse PAYPAL_WEBHOOK_ID ile dogrulama eklenmeli.
    return {
      action: 'not_supported',
      data: { session_id: payload?.data?.resource?.id || '', amount: 0 },
    }
  }
}

export default PayPalProviderService
