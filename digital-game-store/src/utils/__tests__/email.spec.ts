/**
 * SMTP yapilandirmasi ve sablon gonderimi testleri.
 * Aga cikilmaz: nodemailer tasima katmani mock'lanir.
 */
import nodemailer from "nodemailer"
import {
  parseFromHeader,
  readSmtpSettings,
  sendTemplateEmail,
  SMTP_SETTING_KEYS,
} from "../email"

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}))

const createTransport = nodemailer.createTransport as unknown as jest.Mock

const ENV_KEYS = [
  "SMTP_ENABLED",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
]

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

function makeContainer(
  db: Record<string, any> = {},
  { templateAvailable = true } = {}
) {
  const rendered = {
    subject: "Hesabinizi dogrulayin",
    html: "<p>Merhaba</p>",
    text: "Merhaba",
  }
  const logger = { info: jest.fn(), warn: jest.fn() }
  return {
    logger,
    resolve: (name: string) => {
      if (name === "storeSettings") {
        return {
          getSetting: async (key: string) =>
            Object.prototype.hasOwnProperty.call(db, key) ? { key, value: db[key] } : null,
          getSettingValue: async (key: string, fallback: any = null) =>
            Object.prototype.hasOwnProperty.call(db, key) ? db[key] : fallback,
        }
      }
      if (name === "emailTemplate") {
        return {
          getTemplate: async () => (templateAvailable ? { subject: "s", html: "h" } : null),
          ensureDefaults: async () => ({ created: 0, existing: 0 }),
          render: () => rendered,
        }
      }
      if (name === "logger") return logger
      return null
    },
  }
}

beforeEach(() => {
  clearEnv()
  createTransport.mockReset()
  createTransport.mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  })
})

afterAll(clearEnv)

describe("readSmtpSettings", () => {
  it("DB bos ise ortam degiskenlerine duser", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.example.com"
    process.env.SMTP_PORT = "465"
    process.env.SMTP_SECURE = "true"
    process.env.SMTP_USER = "user"
    process.env.SMTP_PASSWORD = "pass"
    process.env.SMTP_FROM_EMAIL = "no-reply@example.com"
    process.env.SMTP_FROM_NAME = "Example"

    const smtp = await readSmtpSettings(makeContainer())
    expect(smtp).toMatchObject({
      enabled: true,
      host: "smtp.example.com",
      port: 465,
      secure: true,
      user: "user",
      password: "pass",
      from_email: "no-reply@example.com",
      from_name: "Example",
    })
  })

  it("panelden kaydedilen DB degeri ortam degerini ezer", async () => {
    process.env.SMTP_ENABLED = "false"
    process.env.SMTP_HOST = "env.example.com"
    process.env.SMTP_FROM_EMAIL = "env@example.com"

    const smtp = await readSmtpSettings(
      makeContainer({
        [SMTP_SETTING_KEYS.enabled]: true,
        [SMTP_SETTING_KEYS.host]: "db.example.com",
        [SMTP_SETTING_KEYS.fromEmail]: "db@example.com",
        [SMTP_SETTING_KEYS.port]: 2525,
      })
    )

    expect(smtp.enabled).toBe(true)
    expect(smtp.host).toBe("db.example.com")
    expect(smtp.from_email).toBe("db@example.com")
    expect(smtp.port).toBe(2525)
  })

  it("DB'de enabled=false ise ortam true olsa bile kapali kalir", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "env.example.com"
    const smtp = await readSmtpSettings(
      makeContainer({ [SMTP_SETTING_KEYS.enabled]: false })
    )
    expect(smtp.enabled).toBe(false)
  })

  it("SMTP_PORT=465 ise secure varsayilani true olur", async () => {
    process.env.SMTP_PORT = "465"
    const smtp = await readSmtpSettings(makeContainer())
    expect(smtp.secure).toBe(true)
  })

  it("SMTP_PASS ve SMTP_FROM=\"Ad <adres>\" takma adlarini kabul eder", async () => {
    process.env.SMTP_ENABLED = "true"
    process.env.SMTP_HOST = "smtp.gmail.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "test@gmail.com"
    process.env.SMTP_PASS = "app-password"
    process.env.SMTP_FROM = "Hupi eSIM <info@hupiplay.uk>"

    const smtp = await readSmtpSettings(makeContainer())
    expect(smtp.password).toBe("app-password")
    expect(smtp.from_email).toBe("info@hupiplay.uk")
    expect(smtp.from_name).toBe("Hupi eSIM")
    expect(smtp.secure).toBe(false)
  })
})

describe("parseFromHeader", () => {
  it("ad + adres ayirir", () => {
    expect(parseFromHeader("Hupi eSIM <info@hupiplay.uk>")).toEqual({
      email: "info@hupiplay.uk",
      name: "Hupi eSIM",
    })
  })

  it("tirnakli adi temizler", () => {
    expect(parseFromHeader('"HUPIPLAY" <no-reply@hupiplay.uk>')).toEqual({
      email: "no-reply@hupiplay.uk",
      name: "HUPIPLAY",
    })
  })

  it("yalnizca adres verilirse ad bos kalir", () => {
    expect(parseFromHeader("info@hupiplay.uk")).toEqual({
      email: "info@hupiplay.uk",
      name: "",
    })
  })

  it("gecersiz degerde bos doner", () => {
    expect(parseFromHeader("")).toEqual({ email: "", name: "" })
    expect(parseFromHeader(undefined)).toEqual({ email: "", name: "" })
  })
})

describe("sendTemplateEmail", () => {
  it("SMTP yapilandirilmamissa sessizce atlar", async () => {
    const container = makeContainer()
    const result = await sendTemplateEmail(container, {
      to: "customer@example.com",
      templateKey: "verify-email",
      locale: "tr",
      silent: true,
    })

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe(true)
    expect(createTransport).not.toHaveBeenCalled()
    expect(container.logger.warn).toHaveBeenCalled()
  })

  it("gonderen adindaki tirnak/satir sonlarini temizler", async () => {
    const container = makeContainer({
      [SMTP_SETTING_KEYS.enabled]: true,
      [SMTP_SETTING_KEYS.host]: "smtp.example.com",
      [SMTP_SETTING_KEYS.fromEmail]: "no-reply@example.com",
      [SMTP_SETTING_KEYS.fromName]: 'HUPI"PLAY\r\nBcc: victim@example.com',
      [SMTP_SETTING_KEYS.user]: "user",
      [SMTP_SETTING_KEYS.password]: "pass",
      "store.name": "HUPIPLAY",
      "store.support_email": "info@hupiplay.uk",
    })

    const result = await sendTemplateEmail(container, {
      to: "customer@example.com",
      templateKey: "verify-email",
      locale: "tr",
    })

    expect(result.sent).toBe(true)
    expect(result.messageId).toBe("test-message-id")

    const transport = createTransport.mock.results[0].value
    const payload = transport.sendMail.mock.calls[0][0]
    expect(payload.from).toBe('"HUPI PLAY Bcc: victim@example.com" <no-reply@example.com>')
    expect(payload.from).not.toContain("\r")
    expect(payload.from).not.toContain("\n")
    expect(payload.replyTo).toBe("info@hupiplay.uk")
  })

  it("sablon bulunamazsa hata doner (patlamaz)", async () => {
    const container = makeContainer(
      {
        [SMTP_SETTING_KEYS.enabled]: true,
        [SMTP_SETTING_KEYS.host]: "smtp.example.com",
        [SMTP_SETTING_KEYS.fromEmail]: "no-reply@example.com",
      },
      { templateAvailable: false }
    )

    const result = await sendTemplateEmail(container, {
      to: "customer@example.com",
      templateKey: "yok-boyle-bir-sablon",
      locale: "tr",
    })

    expect(result.sent).toBe(false)
    expect(result.error).toMatch(/Şablon bulunamadı/)
  })
})
