import { Module } from '@medusajs/framework/utils'
import PricingSettingsService from './service'
import PricingRule from './models/pricing-rule'

export default Module('pricing-settings', {
  service: PricingSettingsService,
})

export { PricingRule }
