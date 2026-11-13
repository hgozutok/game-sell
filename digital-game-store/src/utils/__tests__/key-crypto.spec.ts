/**
 * AES-256-GCM key sifreleme testleri.
 * DIGITAL_KEY_ENCRYPTION_KEY sabit tutulur; yanlis anahtar senaryosunda degistirilir.
 */
import crypto from "crypto"
import { encryptText, decryptText, encryptKeys, decryptKeys, maskKey } from "../key-crypto"

const GOOD_KEY = crypto.randomBytes(32).toString("hex")

beforeAll(() => {
  process.env.DIGITAL_KEY_ENCRYPTION_KEY = GOOD_KEY
})

afterAll(() => {
  delete process.env.DIGITAL_KEY_ENCRYPTION_KEY
})

describe("key-crypto", () => {
  it("encrypt/decrypt roundtrip", () => {
    const secret = "ABCDE-FGHIJ-KLMNO-PQRST"
    const payload = encryptText(secret)

    expect(payload.iv).not.toContain(secret)
    expect(payload.data).not.toContain(secret)
    expect(decryptText(payload)).toBe(secret)
  })

  it("sifreli metin plaintext key icermez (base64)", () => {
    const secret = "XXXX-YYYY-ZZZZ-9999"
    const payload = encryptText(secret)
    const blob = JSON.stringify(payload)

    expect(blob).not.toContain(secret)
    expect(blob).not.toContain(Buffer.from(secret).toString("base64"))
  })

  it("ayni key iki sifreleme farkli IV uretir", () => {
    const a = encryptText("same-secret")
    const b = encryptText("same-secret")
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it("yanlis anahtar ile cozum => hata (GCM auth)", () => {
    const payload = encryptText("top-secret-key")
    process.env.DIGITAL_KEY_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex")
    expect(() => decryptText(payload)).toThrow()
    process.env.DIGITAL_KEY_ENCRYPTION_KEY = GOOD_KEY
  })

  it("degistirilmis ciphertext => cozumlemez (tamper protection)", () => {
    const payload = encryptText("top-secret-key")
    const tampered = { ...payload, data: Buffer.from("evil").toString("base64") }
    expect(() => decryptText(tampered)).toThrow()
  })

  it("gecersiz anahtar uzunlugu => acik hata", () => {
    process.env.DIGITAL_KEY_ENCRYPTION_KEY = "abcd"
    expect(() => encryptText("x")).toThrow(/32 byte/)
    process.env.DIGITAL_KEY_ENCRYPTION_KEY = GOOD_KEY
  })

  it("encryptKeys/decryptKeys liste roundtrip + bos/guguk degerler", () => {
    const keys = [{ type: "cdkey", code: "AAA-BBB-CCC" }, { type: "image", url: "https://x/y.png" }]
    const stored = encryptKeys(keys)

    expect(stored).not.toContain("AAA-BBB-CCC")
    expect(decryptKeys(JSON.parse(stored))).toEqual(keys)
    expect(decryptKeys(null)).toEqual([])
    expect(decryptKeys("not-json-envelope")).toEqual([])
  })

  it("maskKey kisa ve uzun key'leri maskeler", () => {
    expect(maskKey("ABCDEFGH")).toBe("AB****")
    expect(maskKey("ABCD-EFGH-IJKL-MNOP")).toBe("ABCD****MNOP")
    expect(maskKey("")).toBe("****")
  })
})
