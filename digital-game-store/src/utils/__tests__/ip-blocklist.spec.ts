/**
 * ip-blocklist birim testleri: normalizasyon, ozel ag korumasi, engel listesi,
 * beyaz liste ve otomatik blok esigi.
 */
import {
  addWhitelistIp,
  blockIp,
  evaluateAutoBlock,
  getAutoBlockConfig,
  getBlocklist,
  isIpBlocked,
  isPrivateIp,
  normalizeIp,
  recordSuspiciousHit,
  resetSuspiciousHits,
  unblockIp,
} from "../ip-blocklist"

function makeSettingsStore(initial: Record<string, any> = {}) {
  const store = new Map<string, any>(Object.entries(initial))
  return {
    getSettingValue: async (key: string, def: any = null) =>
      store.has(key) ? store.get(key) : def,
    setSetting: async (key: string, value: any) => {
      store.set(key, value)
      return { key, value }
    },
    _store: store,
  }
}

function makeScope(initial: Record<string, any> = {}) {
  const storeSettings = makeSettingsStore(initial)
  return { resolve: () => storeSettings }
}

describe("normalizeIp / isPrivateIp", () => {
  it("IPv4-mapped on ekini temizler", () => {
    expect(normalizeIp("::ffff:172.28.0.5")).toBe("172.28.0.5")
    expect(normalizeIp(" 154.36.176.38 ")).toBe("154.36.176.38")
  })

  it("ozel aglari tespit eder", () => {
    expect(isPrivateIp("172.28.0.5")).toBe(true)
    expect(isPrivateIp("::ffff:172.28.0.5")).toBe(true)
    expect(isPrivateIp("10.0.0.1")).toBe(true)
    expect(isPrivateIp("192.168.1.1")).toBe(true)
    expect(isPrivateIp("127.0.0.1")).toBe(true)
    expect(isPrivateIp("::1")).toBe(true)
    expect(isPrivateIp("fd00::1")).toBe(true)
    expect(isPrivateIp("154.36.176.38")).toBe(false)
    expect(isPrivateIp("85.98.45.70")).toBe(false)
    // 172.15.x ve 172.32.x ozel degil
    expect(isPrivateIp("172.15.0.1")).toBe(false)
    expect(isPrivateIp("172.32.0.1")).toBe(false)
  })
})

describe("blockIp / isIpBlocked / unblockIp", () => {
  it("manuel IP engeller ve sorguda dondurur", async () => {
    const scope = makeScope()
    await blockIp(scope, "154.36.176.38", {
      reason: "vuln scanner",
      source: "manual",
      hours: 0,
    })
    const check = await isIpBlocked(scope, "154.36.176.38")
    expect(check.blocked).toBe(true)
    expect(check.entry?.reason).toBe("vuln scanner")
    expect(check.entry?.expires_at).toBeNull()
  })

  it("sureli blok expires_at ile kaydedilir ve suresi dolunca dusar", async () => {
    const scope = makeScope()
    const now = new Date("2026-11-20T12:00:00Z")
    await blockIp(scope, "1.2.3.4", { reason: "test", source: "auto", hours: 24, now })
    expect((await isIpBlocked(scope, "1.2.3.4", now)).blocked).toBe(true)
    // 25 saat sonra — engel duser
    const later = new Date(now.getTime() + 25 * 60 * 60 * 1000)
    expect((await isIpBlocked(scope, "1.2.3.4", later)).blocked).toBe(false)
    // getBlocklist suresi geceni listeyi temizleyerek cikarir
    const entries = await getBlocklist(scope, later)
    expect(entries.find((e) => e.ip === "1.2.3.4")).toBeUndefined()
  })

  it("beyaz listedeki IP engellenemez", async () => {
    const scope = makeScope()
    await addWhitelistIp(scope, "85.98.45.70")
    await blockIp(scope, "85.98.45.70", { reason: "yanlislik", source: "manual", hours: 0 })
    const check = await isIpBlocked(scope, "85.98.45.70")
    expect(check.blocked).toBe(false)
  })

  it("ozel ag IP'si engellenemez (docker ici istemler zarar gormez)", async () => {
    const scope = makeScope()
    await blockIp(scope, "::ffff:172.28.0.5", { reason: "x", source: "manual", hours: 0 })
    expect((await isIpBlocked(scope, "172.28.0.5")).blocked).toBe(false)
  })

  it("unblock engeli kaldirir", async () => {
    const scope = makeScope()
    await blockIp(scope, "1.2.3.4", { reason: "x", source: "manual", hours: 0 })
    await unblockIp(scope, "1.2.3.4")
    expect((await isIpBlocked(scope, "1.2.3.4")).blocked).toBe(false)
  })
})

describe("otomatik blok motoru", () => {
  beforeEach(() => {
    resetSuspiciousHits()
  })

  it("esik altinda bloklamaz", async () => {
    const scope = makeScope()
    const count = recordSuspiciousHit("154.36.176.38", 10 * 60 * 1000)
    const result = await evaluateAutoBlock(scope, "154.36.176.38", count)
    expect(result.blockedNow).toBe(false)
    expect((await isIpBlocked(scope, "154.36.176.38")).blocked).toBe(false)
  })

  it("esik asilinca IP'yi otomatik engeller", async () => {
    const scope = makeScope()
    let count = 0
    for (let i = 0; i < 20; i++) {
      count = recordSuspiciousHit("154.36.176.38", 10 * 60 * 1000)
    }
    const result = await evaluateAutoBlock(scope, "154.36.176.38", count)
    expect(result.blockedNow).toBe(true)
    expect(result.entry?.source).toBe("auto")
    expect((await isIpBlocked(scope, "154.36.176.38")).blocked).toBe(true)
    // engel listesinde gorunur (admin paneli)
    const entries = await getBlocklist(scope)
    expect(entries.some((e) => e.ip === "154.36.176.38" && e.source === "auto")).toBe(true)
  })

  it("ozel ag IP'yi otomatik bloklamaz (docker ici istemler)", async () => {
    const scope = makeScope()
    let count = 0
    for (let i = 0; i < 50; i++) {
      count = recordSuspiciousHit("::ffff:172.28.0.5", 10 * 60 * 1000)
    }
    const result = await evaluateAutoBlock(scope, "172.28.0.5", count)
    expect(result.blockedNow).toBe(false)
    expect((await isIpBlocked(scope, "172.28.0.5")).blocked).toBe(false)
  })

  it("beyaz listedeki IP'yi otomatik bloklamaz", async () => {
    const scope = makeScope()
    await addWhitelistIp(scope, "85.98.45.70")
    let count = 0
    for (let i = 0; i < 50; i++) {
      count = recordSuspiciousHit("85.98.45.70", 10 * 60 * 1000)
    }
    const result = await evaluateAutoBlock(scope, "85.98.45.70", count)
    expect(result.blockedNow).toBe(false)
  })

  it("ayar kapaliyken hicbir seyi bloklamaz", async () => {
    const scope = makeScope({ "security.autoblock.enabled": false })
    let count = 0
    for (let i = 0; i < 50; i++) {
      count = recordSuspiciousHit("1.2.3.9", 10 * 60 * 1000)
    }
    const result = await evaluateAutoBlock(scope, "1.2.3.9", count)
    expect(result.blockedNow).toBe(false)
    expect((await isIpBlocked(scope, "1.2.3.9")).blocked).toBe(false)
  })

  it("config ayarlari okunur (custom esik)", async () => {
    const scope = makeScope({
      "security.autoblock.threshold": 50,
      "security.autoblock.window_minutes": 5,
      "security.autoblock.block_hours": 0,
    })
    const config = await getAutoBlockConfig(scope)
    expect(config.threshold).toBe(50)
    expect(config.windowMinutes).toBe(5)
    expect(config.blockHours).toBe(0)
  })
})
