import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/framework/types"

type InjectedDependencies = Record<string, unknown>

// Dijital urunler icin fulfillment saglayicisi: fiziksel kargo yok,
// teslimat key e-postasi/hesap sayfasidir.
class DigitalFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "digital"

  constructor(
    protected cradle: InjectedDependencies = {},
    protected options: Record<string, any> = {}
  ) {
    super()
  }

  static validateOptions(options: Record<any, any>): void | never {
    void options
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "digital-delivery",
        name: "Digital Delivery",
        provider_id: "digital",
      },
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: any
  ): Promise<any> {
    return { ...data, delivery_type: "digital" }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return data?.id === "digital-delivery" || data?.provider_id === "digital"
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<CreateFulfillmentResult> {
    return {
      data: { delivery_type: "digital" },
      labels: [],
    }
  }

  async createReturnFulfillment(fulfillment: any): Promise<CreateFulfillmentResult> {
    return { data: { delivery_type: "digital" }, labels: [] }
  }
}

export default DigitalFulfillmentProviderService
