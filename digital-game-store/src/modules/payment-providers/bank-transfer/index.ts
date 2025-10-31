import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { AbstractPaymentProvider } from "@medusajs/framework/utils"

class BankTransferProviderService extends AbstractPaymentProvider {
  static identifier = "bank-transfer"

  async initiatePayment(input: any): Promise<any> {
    const { amount, currency_code } = input.context || input
    
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

  async authorizePayment(input: any): Promise<any> {
    // Bank transfers need manual verification
    return {
      data: {
        ...input.data,
        status: "pending_verification",
      },
      status: "pending",
    }
  }

  async cancelPayment(input: any): Promise<any> {
    return {
      data: {
        ...input.data,
        status: "canceled",
      },
    }
  }

  async capturePayment(input: any): Promise<any> {
    // Admin confirms payment received
    return {
      data: {
        ...input.data,
        status: "captured",
        captured_at: new Date().toISOString(),
      },
    }
  }

  async deletePayment(input: any): Promise<any> {
    return {
      data: {
        ...input.data,
        status: "deleted",
      },
    }
  }

  async getPaymentStatus(input: any): Promise<any> {
    return {
      status: input.data?.status || "pending",
    }
  }

  async refundPayment(input: any): Promise<any> {
    return {
      data: {
        ...input.data,
        refunded_amount: input.amount,
        status: "refunded",
        refunded_at: new Date().toISOString(),
      },
    }
  }

  async retrievePayment(input: any): Promise<any> {
    return {
      data: input.data,
    }
  }

  async updatePayment(input: any): Promise<any> {
    return {
      data: input.data,
    }
  }

  async getWebhookActionAndData(input: any): Promise<any> {
    return {
      action: "not_supported" as any,
      data: {},
    }
  }
}

export { BankTransferProviderService }

export default ModuleProvider(Modules.PAYMENT, {
  services: [BankTransferProviderService],
})
