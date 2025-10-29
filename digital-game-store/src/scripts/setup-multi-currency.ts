import { Modules } from "@medusajs/framework/utils"

export default async function({ container }: any) {
  const regionModule = container.resolve(Modules.REGION)
  const currencyModule = container.resolve(Modules.CURRENCY)
  const logger = container.resolve("logger")

  logger.info("💱 Setting up multi-currency support...")

  try {
    // Get existing regions
    const existingRegions = await regionModule.listRegions()
    logger.info(`📍 Found ${existingRegions.length} existing regions`)

    // Define currency configurations
    const currencies = [
      { code: 'usd', name: 'US Dollar', symbol: '$', region_name: 'United States' },
      { code: 'eur', name: 'Euro', symbol: '€', region_name: 'Europe' },
      { code: 'gbp', name: 'British Pound', symbol: '£', region_name: 'United Kingdom' },
      { code: 'try', name: 'Turkish Lira', symbol: '₺', region_name: 'Turkey' },
    ]

    // Ensure currencies exist
    for (const curr of currencies) {
      try {
        const existing = await currencyModule.listCurrencies({ code: curr.code })
        if (!existing || existing.length === 0) {
          await currencyModule.createCurrencies({
            code: curr.code,
            name: curr.name,
            symbol: curr.symbol,
          })
          logger.info(`✅ Created currency: ${curr.code.toUpperCase()} (${curr.symbol})`)
        } else {
          logger.info(`⏭️ Currency already exists: ${curr.code.toUpperCase()}`)
        }
      } catch (error: any) {
        logger.warn(`⚠️ Currency ${curr.code} might already exist:`, error.message)
      }
    }

    // Create or update regions for each currency
    for (const curr of currencies) {
      try {
        const regionExists = existingRegions.find((r: any) => r.name === curr.region_name)
        
        if (!regionExists) {
          const region = await regionModule.createRegions({
            name: curr.region_name,
            currency_code: curr.code,
            countries: getCountriesForCurrency(curr.code),
            automatic_taxes: false,
            metadata: {
              currency_symbol: curr.symbol,
            },
          })
          logger.info(`✅ Created region: ${curr.region_name} (${curr.code.toUpperCase()})`)
        } else {
          logger.info(`⏭️ Region already exists: ${curr.region_name}`)
        }
      } catch (error: any) {
        logger.error(`❌ Failed to create region for ${curr.code}:`, error.message)
      }
    }

    logger.info("🎉 Multi-currency setup completed!")

    // Summary
    const finalRegions = await regionModule.listRegions()
    logger.info(`\n📊 SUMMARY:`)
    logger.info(`Total Regions: ${finalRegions.length}`)
    for (const region of finalRegions) {
      logger.info(`  - ${region.name}: ${region.currency_code.toUpperCase()}`)
    }

  } catch (error: any) {
    logger.error("Failed to setup multi-currency:", error)
  }
}

// Helper function to get country codes for each currency
function getCountriesForCurrency(currencyCode: string): string[] {
  const countryMap: Record<string, string[]> = {
    usd: ['us', 'ca'],
    eur: ['de', 'fr', 'es', 'it', 'nl', 'be', 'at', 'pt', 'gr', 'ie'],
    gbp: ['gb'],
    try: ['tr'],
  }
  
  return countryMap[currencyCode] || []
}

