import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  addWhitelistIp,
  blockIp,
  getAutoBlockConfig,
  getBlocklist,
  getWhitelist,
  isPrivateIp,
  normalizeIp,
  removeWhitelistIp,
  unblockIp,
} from "../../../utils/ip-blocklist"

/**
 * IP engel listesi yonetimi (admin Guvenlik sayfasi).
 *
 * GET    /admin/ip-blocklist
 *        -> { blocked: BlockedIpEntry[], whitelist: string[], config: AutoBlockConfig }
 *
 * POST   /admin/ip-blocklist
 *        { ip, reason?, permanent? }          -> IP'yi engelle
 *        { whitelist: ip }                    -> beyaz listeye ekle
 *        { remove_whitelist: ip }             -> beyaz listeden cikar
 *        { unblock: ip }                      -> engeli kaldir
 *        { config: { enabled?, threshold?, window_minutes?, block_hours? } }
 *                                             -> otomatik blok ayarlari
 *
 * DELETE /admin/ip-blocklist?ip=1.2.3.4      -> engeli kaldir (unblock ile ayni)
 *
 * Not: ozel/iceri ag IP'leri (10.x, 172.16-31.x, 192.168.x, 127.x, ::1,
 * ::ffff: on ekli docker agi) blok isteklerinde reddedilir.
 */

const IP_RE = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]+)$/i

function validIp(value: unknown): string | null {
  const ip = normalizeIp(value)
  if (!ip || !IP_RE.test(ip)) return null
  return ip
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const [blocked, whitelist, config] = await Promise.all([
      getBlocklist(req.scope),
      getWhitelist(req.scope),
      getAutoBlockConfig(req.scope),
    ])
    res.json({ blocked, whitelist, config })
  } catch (error: any) {
    res.status(500).json({ message: "Engel listesi okunamadı", error: error?.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as any
  try {
    const body = (req.body || {}) as Record<string, any>

    // 1) Otomatik blok ayarlari
    if (body.config && typeof body.config === "object") {
      const storeSettings = req.scope.resolve("storeSettings") as any
      const current = await getAutoBlockConfig(req.scope)
      const next = {
        enabled:
          typeof body.config.enabled === "boolean"
            ? body.config.enabled
            : current.enabled,
        threshold:
          Number.isFinite(Number(body.config.threshold)) && Number(body.config.threshold) >= 3
            ? Math.round(Number(body.config.threshold))
            : current.threshold,
        window_minutes:
          Number.isFinite(Number(body.config.window_minutes)) && Number(body.config.window_minutes) >= 1
            ? Math.round(Number(body.config.window_minutes))
            : current.windowMinutes,
        block_hours:
          Number.isFinite(Number(body.config.block_hours)) && Number(body.config.block_hours) >= 0
            ? Math.round(Number(body.config.block_hours))
            : current.blockHours,
      }
      await storeSettings.setSetting("security.autoblock.enabled", next.enabled, {
        category: "security",
        description: "otomatik IP blok anahtari",
      })
      await storeSettings.setSetting("security.autoblock.threshold", next.threshold, {
        category: "security",
        description: "otomatik blok esigi (supheli istek)",
      })
      await storeSettings.setSetting("security.autoblock.window_minutes", next.window_minutes, {
        category: "security",
        description: "otomatik blok sayac penceresi (dakika)",
      })
      await storeSettings.setSetting("security.autoblock.block_hours", next.block_hours, {
        category: "security",
        description: "otomatik blok suresi (saat, 0=suresiz)",
      })
      logger.info(
        `[admin] otomatik blok ayarlari: enabled=${next.enabled} threshold=${next.threshold} window=${next.window_minutes}dk sure=${next.block_hours}saat`
      )
      const config = await getAutoBlockConfig(req.scope)
      return res.json({ config })
    }

    // 2) Beyaz liste ekle/cikar
    if (typeof body.whitelist === "string" && body.whitelist.trim()) {
      const ip = validIp(body.whitelist)
      if (!ip) {
        return res.status(400).json({ code: "invalid_ip", message: "Geçersiz IP adresi" })
      }
      if (isPrivateIp(ip)) {
        return res.status(400).json({
          code: "private_ip",
          message: "İç ağ adresleri zaten korumalı — beyaz listeye gerek yok",
        })
      }
      const whitelist = await addWhitelistIp(req.scope, ip)
      logger.info(`[admin] beyaz listeye eklendi: ${ip}`)
      return res.json({ whitelist })
    }
    if (typeof body.remove_whitelist === "string" && body.remove_whitelist.trim()) {
      const ip = validIp(body.remove_whitelist)
      if (!ip) {
        return res.status(400).json({ code: "invalid_ip", message: "Geçersiz IP adresi" })
      }
      const whitelist = await removeWhitelistIp(req.scope, ip)
      logger.info(`[admin] beyaz listeden çıkarıldı: ${ip}`)
      return res.json({ whitelist })
    }

    // 3) Engeli kaldir
    if (typeof body.unblock === "string" && body.unblock.trim()) {
      const ip = validIp(body.unblock)
      if (!ip) {
        return res.status(400).json({ code: "invalid_ip", message: "Geçersiz IP adresi" })
      }
      const blocked = await unblockIp(req.scope, ip)
      logger.info(`[admin] engel kaldirildi: ${ip}`)
      return res.json({ blocked })
    }

    // 4) Manuel engelle
    if (typeof body.ip === "string" && body.ip.trim()) {
      const ip = validIp(body.ip)
      if (!ip) {
        return res.status(400).json({ code: "invalid_ip", message: "Geçersiz IP adresi" })
      }
      if (isPrivateIp(ip)) {
        return res.status(400).json({
          code: "private_ip",
          message: "İç ağ/localhost adresleri engellenemez",
        })
      }
      const reason = String(body.reason || "Admin tarafından manuel engellendi").slice(0, 300)
      const permanent = body.permanent === true
      const blocked = await blockIp(req.scope, ip, {
        reason,
        source: "manual",
        // 0 = süresiz (expires_at null kalır); aksi halde 24 saat
        hours: permanent ? 0 : 24,
      })
      logger.warn(`[admin] IP manuel engellendi: ${ip} — ${reason}`)
      return res.json({ blocked })
    }

    return res.status(400).json({
      code: "invalid_payload",
      message: "ip, whitelist, remove_whitelist, unblock veya config gerekli",
    })
  } catch (error: any) {
    res.status(500).json({ message: "İşlem başarısız", error: error?.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as any
  try {
    const ip = validIp(req.query.ip)
    if (!ip) {
      return res.status(400).json({ code: "invalid_ip", message: "?ip= parametresi gerekli" })
    }
    const blocked = await unblockIp(req.scope, ip)
    logger.info(`[admin] engel kaldirildi (DELETE): ${ip}`)
    res.json({ blocked })
  } catch (error: any) {
    res.status(500).json({ message: "Engel kaldırılamadı", error: error?.message })
  }
}
