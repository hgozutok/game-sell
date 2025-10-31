import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import { PaymentProviderError, PaymentProviderSessionResponse } from "@medusajs/framework/types"

class BankTransferProviderService extends AbstractPaymentProvider {
  static identifier = "bank-transfer"

  async initiatePayment(context: any): Promise<PaymentProviderSessionResponse> {
    const { amount, currency_code, customer, context: paymentContext } = context

    // Generate unique payment reference
    const reference = `BANK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    return {
      data: {
        reference,
        amount,
        currency_code,
        status: "pending",
        instructions: {
          bank_name: "Barclays Bank UK",
          account_name: "Digital Game Store Ltd",
          account_number: "12345678",
          sort_code: "20-00-00",
          iban: "GB29NWBK60161331926819",
          swift: "BARCGB22",
          reference: reference,
          note: "Please include the reference number in your payment description"
        }
      },
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    // Bank transfers need manual verification
    return {
      data: {
        ...paymentSessionData,
        status: "pending_verification",
      },
    }
  }

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return {
      data: {
        ...paymentSessionData,
        status: "canceled",
      },
    }
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    // Admin confirms payment received
    return {
      data: {
        ...paymentSessionData,
        status: "captured",
        captured_at: new Date().toISOString(),
      },
    }
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return {
      data: {
        ...paymentSessionData,
        status: "deleted",
      },
    }
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<string> {
    return (paymentSessionData.status as string) || "pending"
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return {
      data: {
        ...paymentSessionData,
        refunded_amount: refundAmount,
        status: "refunded",
        refunded_at: new Date().toISOString(),
      },
    }
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return {
      data: paymentSessionData,
    }
  }

  async updatePayment(
    context: any
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return {
      data: context.data,
    }
  }

  async getWebhookActionAndData(data: any) {
    return {
      action: "not_supported",
      data: {},
    }
  }
}

export { BankTransferProviderService }

export default ModuleProvider(Modules.PAYMENT, {
  services: [BankTransferProviderService],
})

