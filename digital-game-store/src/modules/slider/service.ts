import { MedusaService } from "@medusajs/framework/utils"
import SliderItem from "./models/slider-item"

class SliderService extends MedusaService({
  SliderItem,
}) {
  async createSlide(data: {
    title: string
    subtitle?: string
    image_url: string
    link_url: string
    button_text?: string
    order?: number
  }): Promise<any> {
    return await this.createSliderItems(data)
  }

  async listSlides(filters: {
    is_active?: boolean
  } = {}): Promise<any[]> {
    return await this.listSliderItems(filters, {
      order: { order: "ASC" },
    })
  }

  async getSlide(id: string): Promise<any> {
    return await this.retrieveSliderItem(id)
  }

  async updateSlide(id: string, data: {
    title?: string
    subtitle?: string
    image_url?: string
    link_url?: string
    button_text?: string
    order?: number
    is_active?: boolean
  }): Promise<any> {
    return await this.updateSliderItems({
      selector: { id },
      data
    })
  }

  async deleteSlide(id: string): Promise<void> {
    await this.deleteSliderItems({ id })
  }

  async reorderSlides(slideOrders: Array<{ id: string; order: number }>): Promise<void> {
    for (const item of slideOrders) {
      await this.updateSliderItems({
        selector: { id: item.id },
        data: { order: item.order }
      })
    }
  }

  async getActiveSlides(): Promise<any[]> {
    return await this.listSlides({ is_active: true })
  }
}

export default SliderService

