import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
}

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * POST /admin/settings/logo
 * Body: { data_url: "data:image/png;base64,..." }
 * Logoyu static/ klasorune yazar ve herkese acik URL doner.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const dataUrl = String((req.body as any)?.data_url || "")
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl)

  if (!match) {
    return res.status(400).json({ message: "data_url (base64 gorsel) gerekli" })
  }

  const mime = match[1].toLowerCase()
  const ext = ALLOWED[mime]

  if (!ext) {
    return res.status(400).json({
      message: "Desteklenmeyen format. PNG, JPG, WEBP, SVG veya GIF kullanin.",
    })
  }

  const buffer = Buffer.from(match[2], "base64")

  if (buffer.length > MAX_BYTES) {
    return res.status(400).json({ message: "Logo en fazla 2 MB olabilir" })
  }

  const dir = path.join(process.cwd(), "static")
  fs.mkdirSync(dir, { recursive: true })

  const filename = `logo-${Date.now()}.${ext}`
  fs.writeFileSync(path.join(dir, filename), buffer)

  const baseUrl = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")

  res.status(201).json({
    url: `${baseUrl}/static/${filename}`,
    filename,
    size: buffer.length,
  })
}
