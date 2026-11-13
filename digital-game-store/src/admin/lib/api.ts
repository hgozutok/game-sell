// Admin extension icin ortak fetch yardimcisi.
// Admin panel ile ayni origin'de calisir; oturum cookie'si otomatik gider
// (medusa admin session auth). @medusajs/admin-sdk 2.11.1 sdk export etmedigi
// icin dogrudan fetch kullanilir.

export async function adminFetch<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers:
      options.body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const j = await res.json()
      message = j.message || message
    } catch {
      /* json degil */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export function money(minor: number | null | undefined, currency = "usd"): string {
  if (minor === null || minor === undefined) return "-"
  return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`
}
