import { Modules } from "@medusajs/framework/utils"

/**
 * Var olan admin kullanicisinin sifresini ADMIN_PASSWORD ile degistirir.
 * Kullanici yoksa olusturur (emailpass identity + user bagi).
 * Sifre komut satirinda degil, ortam degiskeninde tasinir.
 */
export default async function ({ container }: any) {
  const logger = container.resolve("logger")
  const authModule = container.resolve(Modules.AUTH)
  const userModule = container.resolve(Modules.USER)

  const email = (process.env.ADMIN_EMAIL || "info@hupiplay.uk").trim()
  const password = process.env.ADMIN_PASSWORD
  if (!password || password.length < 10) {
    logger.error("ADMIN_PASSWORD yok veya 10 karakterden kisa")
    process.exit(1)
  }

  const users = await userModule.listUsers({ email })
  const user = users?.[0]
  if (!user) {
    logger.error(`Kullanici bulunamadi: ${email}`)
    process.exit(1)
  }

  const updated = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password,
    body: {},
  } as any)
  if (updated?.success) {
    logger.info(`Sifre guncellendi: ${email}`)
    process.exit(0)
  }

  logger.error(`updateProvider basarisiz: ${JSON.stringify(updated?.error)}`)
  process.exit(1)
}
