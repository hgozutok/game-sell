import { MedusaService } from '@medusajs/framework/utils'
import PricingRule from './models/pricing-rule'

class PricingSettingsService extends MedusaService({
  PricingRule,
}) {
  async createPricingRule(data: {
    category_id?: string
    category_name: string
    provider: string
    margin_percentage: number
    min_price?: number
    max_price?: number
    priority?: number
  }) {
    const rule = await this.createPricingRules(data)
    return rule
  }

  async getAllPricingRules(filters: {
    provider?: string
    category_id?: string
    is_active?: boolean
  } = {}) {
    const rules = await this.listPricingRules(filters)
    return rules
  }

  async getPricingRule(id: string) {
    const rule = await this.retrievePricingRule(id)
    return rule
  }

  async updatePricingRule(
    id: string,
    data: Partial<{
      margin_percentage: number
      min_price: number
      max_price: number
      is_active: boolean
      priority: number
    }>
  ) {
    const rule = await this.updatePricingRules({
      id,
      ...data,
    })
    return rule
  }

  async deletePricingRule(id: string) {
    await this.deletePricingRules({ id })
  }

  /**
   * Calculate the final price with margin for a product
   */
  async calculatePrice(
    basePrice: number,
    categoryId?: string,
    provider: string = 'all'
  ): Promise<number> {
    // Get applicable rules
    const rules = await this.getAllPricingRules({
      is_active: true,
    })

    // Find the best matching rule
    let applicableRule = null
    let highestPriority = -1

    for (const rule of rules) {
      // Check if rule applies to this provider
      if (rule.provider !== 'all' && rule.provider !== provider) {
        continue
      }

      // Check if rule applies to this category
      if (rule.category_id && rule.category_id !== categoryId) {
        continue
      }

      // Check price range
      if (rule.min_price !== null && basePrice < rule.min_price) {
        continue
      }
      if (rule.max_price !== null && basePrice > rule.max_price) {
        continue
      }

      // Use this rule if it has higher priority
      if (rule.priority > highestPriority) {
        applicableRule = rule
        highestPriority = rule.priority
      }
    }

    // Apply margin
    if (applicableRule) {
      const margin = basePrice * (applicableRule.margin_percentage / 100)
      return Math.round(basePrice + margin)
    }

    // Default margin if no rule found (20%)
    const defaultMargin = basePrice * 0.2
    return Math.round(basePrice + defaultMargin)
  }

  /**
   * Get the applicable margin for a product
   */
  async getApplicableMargin(
    categoryId?: string,
    provider: string = 'all'
  ): Promise<number> {
    const rules = await this.getAllPricingRules({
      is_active: true,
    })

    let applicableRule = null
    let highestPriority = -1

    for (const rule of rules) {
      if (rule.provider !== 'all' && rule.provider !== provider) {
        continue
      }

      if (rule.category_id && rule.category_id !== categoryId) {
        continue
      }

      if (rule.priority > highestPriority) {
        applicableRule = rule
        highestPriority = rule.priority
      }
    }

    return applicableRule ? applicableRule.margin_percentage : 20 // Default 20%
  }
}

export default PricingSettingsService
