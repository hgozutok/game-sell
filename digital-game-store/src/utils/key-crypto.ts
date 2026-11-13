/**
 * Oyun key sifrelemesi — AES-256-GCM.
 *
 * DIGITAL_KEY_ENCRYPTION_KEY (hex, 32 byte) env'den gelir. Eksikse dev ortaminda
 * JWT_SECRET'ten turetilir (uyari loglanir); production'da tanimli olmak ZORUNDA.
 *
 * Key'ler veritabaninda SADECE sifreli saklanir; loglara asla plaintext yazilmaz.
 * Gösterim icin key_prefix (ilk karakterler) ayrilikla doner.
 */
import crypto from "crypto"

const PREFIX = "v1"

function getKey(): Buffer {
  const hex = process.env.DIGITAL_KEY_ENCRYPTION_KEY
  if (hex) {
    const buf = Buffer.from(hex, "hex")
    if (buf.length === 32) return buf
    throw new Error("DIGITAL_KEY_ENCRYPTION_KEY 32 byte (64 hex) olmalidir")
  }
  // Dev fallback: JWT_SECRET'ten deterministik turet
  console.warn(
    "[key-crypto] DIGITAL_KEY_ENCRYPTION_KEY tanimli degil — JWT_SECRET'ten turetildi (DEV ONLY)"
  )
  return crypto.scryptSync(process.env.JWT_SECRET || "dev-secret", "dgs-key-salt", 32)
}

export interface EncryptedPayload {
  iv: string
  tag: string
  data: string
}

export function encryptText(plain: string): EncryptedPayload {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  }
}

export function decryptText(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(payload.iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ])
  return plain.toString("utf8")
}

/** Key listesini sifreli JSON string olarak dondurur (kinguin_order.keys_encrypted / metadata) */
export function encryptKeys<T>(keys: T[]): string {
  return JSON.stringify({ v: PREFIX, payload: encryptText(JSON.stringify(keys)) })
}

export function decryptKeys<T>(stored: any): T[] {
  if (!stored) return []
  try {
    if (typeof stored === "string") {
      const parsed = JSON.parse(stored)
      if (parsed?.v === PREFIX && parsed?.payload) {
        return JSON.parse(decryptText(parsed.payload))
      }
      return []
    }
    if (typeof stored === "object" && stored.v === PREFIX && stored.payload) {
      return JSON.parse(decryptText(stored.payload))
    }
  } catch {
    // bozuk/uyumsuz kayit — bos liste, crash degil
    return []
  }
  return []
}

/** Maskeli gosterim: "ABCD-...-WXYZ" tarzi */
export function maskKey(code: string): string {
  const clean = String(code || "")
  if (clean.length <= 8) return clean.slice(0, 2) + "****"
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`
}

export interface SafeKey {
  id: string
  name?: string
  type: string
  serial_masked: string
  is_image: boolean
}
