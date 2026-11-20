// IP engel listesi + otomatik blok motoru.
//
// Vuln scanner/botlar sunucuyu kisa surede onlarca 404/403 ile tarar
// (gorulen saldiri: ~40 saniyede 60+ endpoint keşfi). Bu modul:
//   1) Manuel engel listesi — admin panelinden eklenen IP'ler
//   2) Otomatik blok — esik ustu supheli istek (404/403/429) ureten IP
//      kisa pencerede otomatik engellenir (varsayilan 24 saat)
//   3) Beyaz liste — hicbir zaman otomatik engellenmeyen IP'ler
//      (admin'in kendi IP'si, ic docker agi vb.)
//
// Engelli liste storeSettings'te kalici tutulur (restart sonrasi da gecerli)
// ve admin panelindeki Guvenlik sayfasindan yonetilir (/admin/ip-blocklist).
// Supheli istek sayaci surec icinde tutulur (hafif; restart'ta sifirlanir).

const BLOCKED_KEY = "security.ip_blocklist.ips"
const WHITELIST_KEY = "security.ip_whitelist"
const AUTO_ENABLED_KEY = "security.autoblock.enabled"
const THRESHOLD_KEY = "security.autoblock.threshold"
const WINDOW_KEY = "security.autoblock.window_minutes"
const HOURS_KEY = "security.autoblock.block_hours"

export interface BlockedIpEntry {
  ip: string
  reason: string
  /** 'manual' = admin, 'auto' = otomatik blok motoru */
  source: "manual" | "auto"
  created_at: string
  /** null = süresiz; ISO tarihi = bu zamana kadar */
  expires_at: string | null
  /** blok anindaki supheli istek sayisi (auto icin) */
  hits?: number
}

export interface AutoBlockConfig {
  enabled: boolean
  /** pencere icinde bu kadar supheli istek -> blok */
  threshold: number
  /** sayac penceresi (dakika) */
  windowMinutes: number
  /** blok suresi (saat); 0 = süresiz */
  blockHours: number
}

export const DEFAULT_AUTO_CONFIG: AutoBlockConfig = {
  enabled: true,
  threshold: 20,
  windowMinutes: 10,
  blockHours: 24,
}

// ---- IP yardimcilari ----

/** ::ffff:1.2.3.4 gibi IPv4-mapped IPv6 on ekini temizler. */
export function normalizeIp(ip: unknown): string {
  return String(ip || "")
    .trim()
    .replace(/^::ffff:/i, "")
    .toLowerCase()
}

/** Ozel/iceri ag IP'leri (docker agi, localhost) hicbloklanmaz. */
export function isPrivateIp(ip: unknown): boolean {
  const normalized = normalizeIp(ip)
  if (!normalized) return true
  if (normalized === "::1" || normalized === "localhost") return true
  if (normalized.startsWith("127.")) return true
  if (normalized.startsWith("10.")) return true
  if (normalized.startsWith("192.168.")) return true
  if (normalized.startsWith("169.254.")) return true
  // 172.16.0.0 - 172.31.255.255
  const m = normalized.match(/^172\.(\d+)\./)
  if (m) {
    const second = Number(m[1])
    if (second >= 16 && second <= 31) return true
  }
  // fc00::/7 IPv6 iceri ag
  if (/^f[cd]/.test(normalized)) return true
  return false
}

// ---- Ayarlar ----

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean)
  if (typeof value === "string" && value.trim()) return [value.trim()]
  return []
}

export async function getAutoBlockConfig(scope: any): Promise<AutoBlockConfig> {
  const storeSettings = scope.resolve("storeSettings") as any
  const num = async (key: string, def: number) => {
    const v = Number(await storeSettings.getSettingValue(key, def).catch(() => def))
    return Number.isFinite(v) ? v : def
  }
  const enabledRaw = await storeSettings
    .getSettingValue(AUTO_ENABLED_KEY, DEFAULT_AUTO_CONFIG.enabled)
    .catch(() => DEFAULT_AUTO_CONFIG.enabled)
  return {
    enabled: enabledRaw !== false && enabledRaw !== "false",
    threshold: Math.max(3, await num(THRESHOLD_KEY, DEFAULT_AUTO_CONFIG.threshold)),
    windowMinutes: Math.max(1, await num(WINDOW_KEY, DEFAULT_AUTO_CONFIG.windowMinutes)),
    blockHours: Math.max(0, await num(HOURS_KEY, DEFAULT_AUTO_CONFIG.blockHours)),
  }
}

// ---- Beyaz liste ----

export async function getWhitelist(scope: any): Promise<string[]> {
  const storeSettings = scope.resolve("storeSettings") as any
  const list = await storeSettings.getSettingValue(WHITELIST_KEY, []).catch(() => [])
  return asStringList(list).map(normalizeIp)
}

export async function addWhitelistIp(scope: any, ip: string): Promise<string[]> {
  const normalized = normalizeIp(ip)
  if (!normalized) throw new Error("Geçersiz IP adresi")
  const storeSettings = scope.resolve("storeSettings") as any
  const list = await getWhitelist(scope)
  if (!list.includes(normalized)) {
    await storeSettings.setSetting(WHITELIST_KEY, [...list, normalized], {
      category: "security",
      description: "otomatik blok beyaz listesi",
    })
    list.push(normalized)
  }
  return list
}

export async function removeWhitelistIp(scope: any, ip: string): Promise<string[]> {
  const normalized = normalizeIp(ip)
  const storeSettings = scope.resolve("storeSettings") as any
  const list = (await getWhitelist(scope)).filter((x) => x !== normalized)
  await storeSettings.setSetting(WHITELIST_KEY, list, {
    category: "security",
    description: "otomatik blok beyaz listesi",
  })
  return list
}

// ---- Engel listesi ----

async function loadEntries(scope: any): Promise<BlockedIpEntry[]> {
  const storeSettings = scope.resolve("storeSettings") as any
  const raw = await storeSettings.getSettingValue(BLOCKED_KEY, []).catch(() => [])
  return Array.isArray(raw) ? (raw as BlockedIpEntry[]) : []
}

async function saveEntries(scope: any, entries: BlockedIpEntry[]): Promise<void> {
  const storeSettings = scope.resolve("storeSettings") as any
  await storeSettings.setSetting(BLOCKED_KEY, entries, {
    category: "security",
    description: "engelli IP listesi",
  })
}

/** Tum engel listesi; suresi dolmus kayitlar temizlenir. */
export async function getBlocklist(
  scope: any,
  now: Date = new Date()
): Promise<BlockedIpEntry[]> {
  const entries = await loadEntries(scope)
  const nowMs = now.getTime()
  const valid = entries.filter(
    (e) => !e.expires_at || new Date(e.expires_at).getTime() > nowMs
  )
  if (valid.length !== entries.length) {
    await saveEntries(scope, valid)
  }
  return valid
}

export interface IpBlockCheck {
  blocked: boolean
  entry?: BlockedIpEntry
}

/** IP engelli mi? (beyaz liste ve ozel ag IP'leri asla engellenmez) */
export async function isIpBlocked(
  scope: any,
  ip: unknown,
  now: Date = new Date()
): Promise<IpBlockCheck> {
  const normalized = normalizeIp(ip)
  if (!normalized || isPrivateIp(normalized)) return { blocked: false }

  const whitelist = await getWhitelist(scope)
  if (whitelist.includes(normalized)) return { blocked: false }

  const entries = await getBlocklist(scope, now)
  const entry = entries.find((e) => normalizeIp(e.ip) === normalized)
  if (entry) return { blocked: true, entry }
  return { blocked: false }
}

/** IP'yi engeller (idempotent — mevcut kaydi gunceller). */
export async function blockIp(
  scope: any,
  ip: string,
  opts: {
    reason: string
    source: "manual" | "auto"
    hours?: number // 0 = süresiz
    hits?: number
    now?: Date
  }
): Promise<BlockedIpEntry[]> {
  const normalized = normalizeIp(ip)
  if (!normalized) throw new Error("Geçersiz IP adresi")

  const now = opts.now || new Date()
  const hours = Number.isFinite(opts.hours) ? Number(opts.hours) : 0
  const expiresAt =
    hours > 0 ? new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString() : null

  const entries = await getBlocklist(scope, now)
  const existingIndex = entries.findIndex((e) => normalizeIp(e.ip) === normalized)
  const entry: BlockedIpEntry = {
    ip: normalized,
    reason: String(opts.reason || "").slice(0, 300),
    source: opts.source,
    created_at: now.toISOString(),
    expires_at: expiresAt,
    hits: opts.hits,
  }
  if (existingIndex >= 0) {
    entries[existingIndex] = entry
  } else {
    entries.push(entry)
  }
  await saveEntries(scope, entries)
  return entries
}

/** Engeli kaldirir (manuel veya otomatik fark etmez). */
export async function unblockIp(scope: any, ip: string): Promise<BlockedIpEntry[]> {
  const normalized = normalizeIp(ip)
  const entries = await getBlocklist(scope)
  const filtered = entries.filter((e) => normalizeIp(e.ip) !== normalized)
  await saveEntries(scope, filtered)
  return filtered
}

// ---- Otomatik blok motoru ----
// Supheli (404/403/429) istekler surec icinde pencere bazli sayilir;
// esik asilirsa IP kalici olarak engel listesine yazilir.

interface HitBucket {
  hits: number[]
}
const suspiciousHits = new Map<string, HitBucket>()

/** Supheli istek kaydet; pencere icindeki toplami dondurur. */
export function recordSuspiciousHit(
  ip: unknown,
  windowMs: number,
  now: number = Date.now()
): number {
  const normalized = normalizeIp(ip)
  if (!normalized) return 0
  const bucket = suspiciousHits.get(normalized) || { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  bucket.hits.push(now)
  suspiciousHits.set(normalized, bucket)
  // bellek sogurmasi: cok buyukse eski kayitlari temizle
  if (suspiciousHits.size > 20_000) {
    for (const [key, b] of suspiciousHits) {
      if (b.hits.every((t) => now - t >= windowMs)) suspiciousHits.delete(key)
    }
  }
  return bucket.hits.length
}

/** IP'nin engellenmis olma durumunu yeniler (otomatik blok degerlendirmesi). */
export async function evaluateAutoBlock(
  scope: any,
  ip: unknown,
  hitCount?: number
): Promise<{ blockedNow: boolean; entry?: BlockedIpEntry; count: number }> {
  const normalized = normalizeIp(ip)
  if (!normalized || isPrivateIp(normalized)) {
    return { blockedNow: false, count: 0 }
  }

  const config = await getAutoBlockConfig(scope)
  if (!config.enabled) {
    return { blockedNow: false, count: hitCount ?? 0 }
  }

  const whitelist = await getWhitelist(scope)
  if (whitelist.includes(normalized)) {
    return { blockedNow: false, count: hitCount ?? 0 }
  }

  const check = await isIpBlocked(scope, normalized)
  if (check.blocked) {
    return { blockedNow: false, count: hitCount ?? 0 }
  }

  const count = hitCount ?? 0
  if (count < config.threshold) {
    return { blockedNow: false, count }
  }

  const entries = await blockIp(scope, normalized, {
    reason: `Otomatik blok: ${config.windowMinutes} dk'da ${count} şüpheli istek (404/403/429)`,
    source: "auto",
    hours: config.blockHours,
    hits: count,
  })
  const entry = entries.find((e) => normalizeIp(e.ip) === normalized)
  // sayaci sifirla — blok zaten kalici
  suspiciousHits.delete(normalized)
  return { blockedNow: true, entry, count }
}

/** Testler icin sayaci temizler. */
export function resetSuspiciousHits(): void {
  suspiciousHits.clear()
}
