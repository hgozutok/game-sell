/**
 * E-posta dogrulama kapisinin SMTP durumuna gore davranisi.
 * SMTP yapilandirilmamissa dogrulama zorunlu olmamali; aksi halde kayit olan
 * kullanici ne dogrulama e-postasi alabilir ne de giris yapabilir.
 */
import { getAuthSettings } from "../auth-session"

const ENV_KEYS = [
  "SMTP_ENABLED",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
  "STORE_URL",
  "AUTH_EMAIL_VERIFICATION_REQUIRED",
]

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

function makeScope(settings: Record<string, any> = {}) {
  const logger = { info: jest.fn(), warn: jest.fn() }
  return {
    logger,
    resolve: (name: string) => {
      if (name === "storeSettings") {
        return {
          listStoreSettings: async () => settings.list || [],
          getSettingValue: async (key: string, fallback: any = null) =>
            Object.prototype.hasOwnProperty.call(settings.map || {}, key)
              ? settings.map[key]
              : fallback,
        }
      }
      if (name === "configModule" || name === "config") {
        return { projectConfig: { backendUrl: "https://api.example.com" } }
      }
      if (name === "logger") return logger
      return null
    },
  }
}

beforeEach(clearEnv)
afterAll(clearEnv)

describe("getAuthSettings — e-posta dogrulama kapisi", () => {
  it("SMTP yoksa dogrulama zorunlu olmaz", async () => {
    const settings = await getAuthSettings(makeScope())
    expect(settings.verificationRequired).toBe(false)
  })

  it("ortam degiskenleriyle SMTP varsa dogrulama zorunlu olur", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.example.com"
    process.env.SMTP_FROM_EMAIL = "no-reply@example.com"
    const settings = await getAuthSettings(makeScope())
    expect(settings.verificationRequired).toBe(true)
  })

  it("SMTP acik ama gonderici adresi yoksa dogrulama zorunlu olmaz", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.example.com"
    const settings = await getAuthSettings(makeScope())
    expect(settings.verificationRequired).toBe(false)
  })

  it("panelden dogrulama kapatilirsa SMTP olsa bile zorunlu olmaz", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.example.com"
    process.env.SMTP_FROM_EMAIL = "no-reply@example.com"
    const scope = makeScope({
      list: [{ key: "auth.email_verification_required", value: false }],
      map: { "auth.email_verification_required": false },
    })
    const settings = await getAuthSettings(scope)
    expect(settings.verificationRequired).toBe(false)
  })

  it("frontend adresi STORE_URL'den gelir ve saga egik cizgi temizlenir", async () => {
    process.env.STORE_URL = "https://hupiplay.uk/"
    const settings = await getAuthSettings(makeScope())
    expect(settings.frontendUrl).toBe("https://hupiplay.uk")
    expect(settings.backendUrl).toBe("https://api.example.com")
  })

  it("AUTH_EMAIL_VERIFICATION_REQUIRED=false SMTP olsa bile dogrulamayi kapatir", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.example.com"
    process.env.SMTP_FROM_EMAIL = "no-reply@example.com"
    process.env.AUTH_EMAIL_VERIFICATION_REQUIRED = "false"
    const settings = await getAuthSettings(makeScope())
    expect(settings.verificationRequired).toBe(false)
  })

  it("panel ayari ortam degiskeninden onceliklidir", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.example.com"
    process.env.SMTP_FROM_EMAIL = "no-reply@example.com"
    process.env.AUTH_EMAIL_VERIFICATION_REQUIRED = "false"
    const scope = makeScope({
      list: [{ key: "auth.email_verification_required", value: true }],
      map: { "auth.email_verification_required": true },
    })
    const settings = await getAuthSettings(scope)
    expect(settings.verificationRequired).toBe(true)
  })
})
