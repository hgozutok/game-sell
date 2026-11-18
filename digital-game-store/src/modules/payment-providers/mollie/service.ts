import { AbstractPaymentProvider, MedusaError } from '@medusajs/framework/utils'

class MollieProviderService extends AbstractPaymentProvider {
  constructor(
    cradle: Record<string, unknown> = {},
    options: Record<string, any> = {}
  ) {
    super(cradle, options)
  }

  static identifier = 'mollie'

  async initiatePayment(input: any): Promise<any> {
    // DIKKAT: Bu saglayici gercek bir Mollie entegrasyonu degildir. Eskiden
    // API'ye gitmeden "pending/authorized" donuyordu; musterinin para odemeden
    // siparis verebilmesine yol aciyordu. Entegrasyon tamamlanana kadar kapali.
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Mollie odemesi yapilandirilmadi: saglayici entegrasyonu tamamlanmadi.'
    )
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
