import { AbstractPaymentProvider } from '@medusajs/framework/utils'

class MollieProviderService extends AbstractPaymentProvider {
  static identifier = 'mollie'

  async initiatePayment(input: any): Promise<any> {
    // In production, create Mollie payment here
    return {
      data: {
        status: "pending",
        mollie_payment_id: `MOLLIE-${Date.now()}`,
      },
    }
  }

  async authorizePayment(input: any): Promise<any> {
    return {
      data: {
        ...input.data,
        status: "authorized",
      },
      status: "authorized",
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
    return {
      data: {
        ...input.data,
        status: "captured",
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
        status: "refunded",
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

export { MollieProviderService }
