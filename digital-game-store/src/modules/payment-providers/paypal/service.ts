import {
  AbstractPaymentProvider,
  PaymentProviderError,
  PaymentProviderSessionResponse,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  WebhookActionResult,
} from '@medusajs/framework/utils'
import axios from 'axios'

interface PayPalOptions {
  client_id: string
  client_secret: string
  sandbox?: boolean
}

class PayPalProviderService extends AbstractPaymentProvider<PayPalOptions> {
  static identifier = 'paypal'
  protected baseUrl: string
  protected accessToken: string | null = null
  protected tokenExpiry: number = 0

  constructor(container: any, options: PayPalOptions) {
    super(container, options)

    if (!options.client_id || !options.client_secret) {
      throw new Error('PayPal client_id and client_secret are required')
    }

    this.baseUrl = options.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
  }

  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const auth = Buffer.from(`${this.options.client_id}:${this.options.client_secret}`).toString('base64')

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      this.accessToken = response.data.access_token
      // Set expiry to 5 minutes before actual expiry
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000

      return this.accessToken
    } catch (error) {
      throw new PaymentProviderError('Failed to get PayPal access token', error)
    }
  }

  async getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<PaymentSessionStatus> {
    const orderId = paymentSessionData.id as string

    try {
      const token = await this.getAccessToken()
      const response = await axios.get(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const order = response.data

      switch (order.status) {
        case 'COMPLETED':
        case 'APPROVED':
          return PaymentSessionStatus.AUTHORIZED
        case 'VOIDED':
          return PaymentSessionStatus.CANCELED
        case 'CREATED':
        case 'SAVED':
          return PaymentSessionStatus.PENDING
        default:
          return PaymentSessionStatus.ERROR
      }
    } catch (error) {
      throw new PaymentProviderError('Failed to get payment status from PayPal', error)
    }
  }

  async initiatePayment(context: any): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const { amount, currency_code, email, context: paymentContext, resource_id } = context

    try {
      const token = await this.getAccessToken()

      const order = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: resource_id,
            amount: {
              currency_code: currency_code.toUpperCase(),
              value: (amount / 100).toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: paymentContext?.return_url || `${process.env.FRONTEND_URL}/checkout/success`,
          cancel_url: paymentContext?.cancel_url || `${process.env.FRONTEND_URL}/checkout/failed`,
        },
      }

      const response = await axios.post(`${this.baseUrl}/v2/checkout/orders`, order, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const approveLink = response.data.links.find((link: any) => link.rel === 'approve')

      return {
        data: {
          id: response.data.id,
          status: response.data.status,
          approve_url: approveLink?.href,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to create PayPal order', error)
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const orderId = paymentSessionData.id as string

    try {
      const token = await this.getAccessToken()

      // Capture the payment
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        data: {
          ...paymentSessionData,
          status: response.data.status,
          capture_id: response.data.purchase_units[0]?.payments?.captures?.[0]?.id,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to authorize PayPal payment', error)
    }
  }

  async cancelPayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    // PayPal orders are automatically voided after 3 hours if not captured
    return {
      data: {
        ...paymentSessionData,
        status: 'voided',
      },
    }
  }

  async capturePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return await this.authorizePayment(paymentSessionData, {})
  }

  async deletePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return await this.cancelPayment(paymentSessionData)
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const captureId = paymentSessionData.capture_id as string

    if (!captureId) {
      return new PaymentProviderError('Cannot refund: capture_id not found', new Error('Missing capture_id'))
    }

    try {
      const token = await this.getAccessToken()

      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        {
          amount: {
            value: (refundAmount / 100).toFixed(2),
            currency_code: 'USD', // Should be extracted from payment data
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        data: {
          ...paymentSessionData,
          refund_id: response.data.id,
          refunded_amount: refundAmount,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to refund PayPal payment', error)
    }
  }

  async retrievePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const orderId = paymentSessionData.id as string

    try {
      const token = await this.getAccessToken()
      const response = await axios.get(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: {
          id: response.data.id,
          status: response.data.status,
          amount: parseFloat(response.data.purchase_units[0].amount.value) * 100,
          currency: response.data.purchase_units[0].amount.currency_code,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to retrieve PayPal order', error)
    }
  }

  async updatePayment(
    context: any
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    // PayPal doesn't support updating orders after creation
    return {
      data: context.data,
    }
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload['payload']): Promise<WebhookActionResult> {
    const eventType = payload.event_type

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
      case 'PAYMENT.CAPTURE.COMPLETED':
        return {
          action: 'authorized',
          data: {
            session_id: payload.resource?.id,
            amount: parseFloat(payload.resource?.amount?.value || '0') * 100,
          },
        }
      case 'CHECKOUT.ORDER.VOIDED':
      case 'PAYMENT.CAPTURE.DENIED':
        return {
          action: 'failed',
          data: {
            session_id: payload.resource?.id,
          },
        }
      default:
        return {
          action: 'not_supported',
        }
    }
  }
}

export { PayPalProviderService }

