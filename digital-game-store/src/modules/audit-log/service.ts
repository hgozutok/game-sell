import { MedusaService } from "@medusajs/framework/utils"
import AuditLog from "./models/audit-log"

/**
 * Audit log servisi — admin eylemlerini kaydeder.
 * Kayit hatasi ana akisi bozmamali (fire-and-forget kullanilabilir).
 */
class AuditLogService extends MedusaService({ AuditLog }) {
  /**
   * Tek satir denetim kaydi. `diff` icine secret/duz key KOYMAYIN —
   * cagirici sorumlulugunda; burada bilinen secret alanlari temizlenir.
   */
  async log(entry: {
    action: string
    entity: string
    entity_id?: string | null
    diff?: Record<string, any> | null
    actor_id?: string | null
    actor_email?: string | null
    ip?: string | null
  }): Promise<void> {
    const safeDiff = this.sanitizeDiff(entry.diff)
    try {
      await this.createAuditLogs({
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entity_id ?? null,
        diff: safeDiff,
        actor_id: entry.actor_id ?? null,
        actor_email: entry.actor_email ?? null,
        ip: entry.ip ?? null,
      } as any)
    } catch (e: any) {
      // audit kaydi yazilamamasi eylemi engellememeli; log'la ve devam
      console.warn(`[audit-log] kayit yazilamadi (${entry.action}): ${e?.message}`)
    }
  }

  /** Bilinen hassas alanlari maskele */
  private sanitizeDiff(diff?: Record<string, any> | null): Record<string, any> | null {
    if (!diff) return null
    const SENSITIVE = ["api_key", "apiKey", "secret", "password", "webhook_secret", "token"]
    const clean = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(clean)
      if (obj && typeof obj === "object") {
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) {
          out[k] = SENSITIVE.includes(k) ? "***" : clean(v)
        }
        return out
      }
      return obj
    }
    return clean(diff)
  }
}

export default AuditLogService
