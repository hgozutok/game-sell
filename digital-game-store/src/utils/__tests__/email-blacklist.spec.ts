/**
 * email-blacklist birim testleri: tam adres/alan adi eslesmesi, normalization,
 * ekleme/cikarma idempotency ve order-guard sarmalayicisi.
 */
import {
  addDomainToBlacklist,
  addEmailToBlacklist,
  checkEmailBlacklist,
  removeDomainFromBlacklist,
  removeEmailFromBlacklist,
  verifyEmailNotBlacklisted,
} from "../email-blacklist"

function makeSettingsStore(initial: Record<string, any> = {}) {
  const store = new Map<string, any>(Object.entries(initial))
  return {
    getSettingValue: async (key: string, def: any = null) =>
      store.has(key) ? store.get(key) : def,
    setSetting: async (key: string, value: any) => {
      store.set(key, value)
      return { key, value }
    },
    // testlerde dogrulama icin
    _store: store,
  }
}

function makeScope(initial: Record<string, any> = {}) {
  const storeSettings = makeSettingsStore(initial)
  return { resolve: () => storeSettings }
}

describe("checkEmailBlacklist", () => {
  it("tam e-posta eslesmesinde engeller", async () => {
    const scope = makeScope({
      "auth.email_blacklist.emails": ["bot@mailinator.com"],
    })
    const result = await checkEmailBlacklist(scope, "bot@mailinator.com")
    expect(result.blocked).toBe(true)
    expect(result.kind).toBe("email")
  })

  it("alan adi eslesmesinde engeller (buyuk/kucuk harf duyarsiz)", async () => {
    const scope = makeScope({
      "auth.email_blacklist.domains": ["mailinator.com"],
    })
    const result = await checkEmailBlacklist(scope, "QA7848@mailinator.com")
    expect(result.blocked).toBe(true)
    expect(result.kind).toBe("domain")
    expect(result.match).toBe("mailinator.com")
  })

  it("temiz e-postayi gecirir", async () => {
    const scope = makeScope({
      "auth.email_blacklist.emails": ["bot@mailinator.com"],
      "auth.email_blacklist.domains": ["mailinator.com"],
    })
    const result = await checkEmailBlacklist(scope, "musteri@gmail.com")
    expect(result.blocked).toBe(false)
  })

  it("gecersiz/bos e-postayi engellemez", async () => {
    const scope = makeScope({
      "auth.email_blacklist.domains": ["mailinator.com"],
    })
    expect((await checkEmailBlacklist(scope, "")).blocked).toBe(false)
    expect((await checkEmailBlacklist(scope, "gecerksiz")).blocked).toBe(false)
  })
})

describe("add/remove", () => {
  it("e-posta ekler, aynisini tekrar eklemek idempotent", async () => {
    const scope = makeScope()
    await addEmailToBlacklist(scope, "Spam@Example.COM ")
    await addEmailToBlacklist(scope, "spam@example.com")
    const store = (scope.resolve() as any)._store as Map<string, any>
    expect(store.get("auth.email_blacklist.emails")).toEqual(["spam@example.com"])
  })

  it("alan adi normalize edilerek eklenir (@ on eki temizlenir)", async () => {
    const scope = makeScope()
    await addDomainToBlacklist(scope, "@Mailinator.com")
    const store = (scope.resolve() as any)._store as Map<string, any>
    expect(store.get("auth.email_blacklist.domains")).toEqual(["mailinator.com"])
  })

  it("gecersiz degerlerde hata verir", async () => {
    const scope = makeScope()
    await expect(addEmailToBlacklist(scope, "gecerksiz")).rejects.toThrow()
    await expect(addDomainToBlacklist(scope, "gecerksiz")).rejects.toThrow()
  })

  it("cikarma calisir", async () => {
    const scope = makeScope({
      "auth.email_blacklist.emails": ["a@b.com", "c@d.com"],
      "auth.email_blacklist.domains": ["mailinator.com"],
    })
    await removeEmailFromBlacklist(scope, "A@B.COM")
    await removeDomainFromBlacklist(scope, "mailinator.com")
    const store = (scope.resolve() as any)._store as Map<string, any>
    expect(store.get("auth.email_blacklist.emails")).toEqual(["c@d.com"])
    expect(store.get("auth.email_blacklist.domains")).toEqual([])
  })
})

describe("verifyEmailNotBlacklisted", () => {
  it("engelli adreste 403 email_blocked doner", async () => {
    const scope = makeScope({
      "auth.email_blacklist.domains": ["mailinator.com"],
    })
    const result = await verifyEmailNotBlacklisted(scope, "x@mailinator.com")
    expect(result.ok).toBe(false)
    expect(result.status).toBe(403)
    expect(result.code).toBe("email_blocked")
    expect(result.message).toContain("mailinator.com")
  })

  it("temiz adreste ok doner", async () => {
    const scope = makeScope()
    const result = await verifyEmailNotBlacklisted(scope, "x@gmail.com")
    expect(result.ok).toBe(true)
  })
})
