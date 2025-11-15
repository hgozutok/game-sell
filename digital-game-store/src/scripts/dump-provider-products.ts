import fs from "fs/promises"
import path from "path"

const DEFAULT_LIMIT = Number(process.env.PROVIDER_DUMP_LIMIT || 500)

type ProviderKey = "codeswholesale" | "kinguin"

interface DumpOptions {
  key: ProviderKey
  service: {
    listAllProducts: (limit?: number) => Promise<any[]>
  }
  limit?: number
  logger: any
  outputDir: string
}

async function dumpProviderProducts({
  key,
  service,
  limit = DEFAULT_LIMIT,
  logger,
  outputDir,
}: DumpOptions) {
  logger.info(`📥 Fetching ${key} products (limit=${limit})...`)

  const startedAt = Date.now()
  const products = await service.listAllProducts(limit)
  const durationMs = Date.now() - startedAt

  logger.info(`✅ Retrieved ${products.length} ${key} products in ${durationMs}ms`)

  const payload = {
    provider: key,
    fetched_at: new Date().toISOString(),
    total: products.length,
    products,
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `${key}-products-${timestamp}.json`
  const filepath = path.join(outputDir, filename)

  await fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8")
  logger.info(`💾 Saved ${key} dump to ${filepath}`)

  return filepath
}

export default async function ({ container }: any) {
  const logger = container.resolve("logger")
  const codesWholesale = container.resolve("codesWholesale")
  const kinguin = container.resolve("kinguin")

  const outputDir = path.join(process.cwd(), "data")
  await fs.mkdir(outputDir, { recursive: true })

  const results: Record<ProviderKey, string> = {
    codeswholesale: "",
    kinguin: "",
  }

  results.codeswholesale = await dumpProviderProducts({
    key: "codeswholesale",
    service: codesWholesale,
    logger,
    outputDir,
  })

  results.kinguin = await dumpProviderProducts({
    key: "kinguin",
    service: kinguin,
    logger,
    outputDir,
  })

  logger.info("📝 Provider product dumps completed:", results)
}


