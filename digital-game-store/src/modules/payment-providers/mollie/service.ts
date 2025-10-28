import {
  AbstractPaymentProvider,
  PaymentProviderError,
  PaymentProviderSessionResponse,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  WebhookActionResult,
} from '@medusajs/framework/utils'
// @ts-ignore
import createMollieClient, { PaymentStatus } from '@mollie/api-client'

interface MollieOptions {
  api_key: string
  webhook_url?: string
}

class MollieProviderService extends AbstractPaymentProvider<MollieOptions> {
  static identifier = 'mollie'
  protected mollieClient: any

  constructor(container: any, options: MollieOptions) {
    super(container, options)

    if (!options.api_key) {
      throw new Error('Mollie API key is required')
    }

    this.mollieClient = createMollieClient({ apiKey: options.api_key })
  }

  async getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<PaymentSessionStatus> {
    const paymentId = paymentSessionData.id as string

    try {
      const payment = await this.mollieClient.payments.get(paymentId)

      switch (payment.status) {
        case PaymentStatus.paid:
          return PaymentSessionStatus.AUTHORIZED
        case PaymentStatus.failed:
        case PaymentStatus.expired:
        case PaymentStatus.canceled:
          return PaymentSessionStatus.ERROR
        case PaymentStatus.pending:
        case PaymentStatus.open:
          return PaymentSessionStatus.PENDING
        default:
          return PaymentSessionStatus.PENDING
      }
    } catch (error) {
      throw new PaymentProviderError('Failed to get payment status from Mollie', error)
    }
  }

  async initiatePayment(context: any): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const { amount, currency_code, email, context: paymentContext, resource_id } = context

    try {
      const payment = await this.mollieClient.payments.create({
        amount: {
          value: (amount / 100).toFixed(2),
          currency: currency_code.toUpperCase(),
        },
        description: `Order ${resource_id}`,
        redirectUrl: paymentContext.return_url || `${process.env.FRONTEND_URL}/checkout/success`,
        webhookUrl: this.options.webhook_url,
        metadata: {
          order_id: resource_id,
          email: email,
        },
      })

      return {
        data: {
          id: payment.id,
          status: payment.status,
          checkout_url: payment._links.checkout.href,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to create Mollie payment', error)
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const status = await this.getPaymentStatus(paymentSessionData)

    if (status === PaymentSessionStatus.AUTHORIZED) {
      return {
        data: paymentSessionData,
      }
    }

    return new PaymentProviderError('Payment not authorized', new Error('Payment status is not authorized'))
  }

  async cancelPayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const paymentId = paymentSessionData.id as string

    try {
      await this.mollieClient.payments.cancel(paymentId)

      return {
        data: {
          ...paymentSessionData,
          status: 'canceled',
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to cancel Mollie payment', error)
    }
  }

  async capturePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    // Mollie payments are automatically captured when paid
    return {
      data: paymentSessionData,
    }
  }

  async deletePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return await this.cancelPayment(paymentSessionData)
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const paymentId = paymentSessionData.id as string

    try {
      const refund = await this.mollieClient.payments_refunds.create({
        paymentId: paymentId,
        amount: {
          value: (refundAmount / 100).toFixed(2),
          currency: 'USD', // Should be extracted from payment data
        },
      })

      return {
        data: {
          ...paymentSessionData,
          refund_id: refund.id,
          refunded_amount: refundAmount,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to refund Mollie payment', error)
    }
  }

  async retrievePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    const paymentId = paymentSessionData.id as string

    try {
      const payment = await this.mollieClient.payments.get(paymentId)

      return {
        data: {
          id: payment.id,
          status: payment.status,
          amount: parseFloat(payment.amount.value) * 100,
          currency: payment.amount.currency,
        },
      }
    } catch (error) {
      return new PaymentProviderError('Failed to retrieve Mollie payment', error)
    }
  }

  async updatePayment(
    context: any
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    // Mollie doesn't support updating payments
    return {
      data: context.data,
    }
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload['payload']): Promise<WebhookActionResult> {
    const paymentId = payload.data?.id

    if (!paymentId) {
      return {
        action: 'not_supported',
      }
    }

    try {
      const payment = await this.mollieClient.payments.get(paymentId)

      switch (payment.status) {
        case PaymentStatus.paid:
          return {
            action: 'authorized',
            data: {
              session_id: payment.id,
              amount: parseFloat(payment.amount.value) * 100,
            },
          }
        case PaymentStatus.failed:
        case PaymentStatus.expired:
        case PaymentStatus.canceled:
          return {
            action: 'failed',
            data: {
              session_id: payment.id,
            },
          }
        default:
          return {
            action: 'not_supported',
          }
      }
    } catch (error) {
      return {
        action: 'failed',
      }
    }
  }
}

export { MollieProviderService }

