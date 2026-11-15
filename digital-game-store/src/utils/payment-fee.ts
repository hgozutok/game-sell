// Odeme komisyonu: admin panelde saglayici basina "%X + sabit tutar" tanimlanir.
// Ayar anahtarlari: payment.fee.<provider>.percent / .fixed_minor / .currency
// Ornek: stripe -> %3 + 30 minor GBP (0.30 GBP). Sabit tutar siparis kuruna cevrilir.
import { convertCurrencyAmount } from './currency'

const PROVIDERS = ['stripe', 'paypal', 'mollie', 'bank-transfer']

/** Hatali girislerin siparisi sisirmesini engeller. */
function clampPercent(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(n, 0), 100)
}

function toMinor(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n))
}

export interface PaymentFeeConfig {
  percent: number
  fixedMinor: number
  currency: string
}

export interface AppliedPaymentFee extends PaymentFeeConfig {
  provider: string
  /** komisyonun siparis para birimindeki karsiligi (minor) */
  feeMinor: number
}

export async function readPaymentFees(scope: any): Promise<Record<string, PaymentFeeConfig>> {
  const storeSettings = scope.resolve('storeSettings') as any
  const map: Record<string, any> = {}
  try {
    const list = (await storeSettings.listStoreSettings?.({})) || []
    for (const s of list) map[s.key] = s.value
  } catch {
    /* bos */
  }
  const result: Record<string, PaymentFeeConfig> = {}
  for (const provider of PROVIDERS) {
    const percent = clampPercent(map[`payment.fee.${provider}.percent`])
    const fixedMinor = toMinor(map[`payment.fee.${provider}.fixed_minor`])
    const currency =
      String(map[`payment.fee.${provider}.currency`] || 'gbp').toLowerCase() || 'gbp'
    if (percent > 0 || fixedMinor > 0) {
      result[provider] = { percent, fixedMinor, currency }
    }
  }
  return result
}

/** Siparis para birimine cevrilmis komisyon (minor). Ayar yoksa 0 doner. */
export async function applyPaymentFee(
  scope: any,
  provider: string,
  orderTotalMinor: number,
  orderCurrency: string,
  rates: Record<string, number>
): Promise<AppliedPaymentFee | null> {
  const normalized = String(provider || '').toLowerCase().replace(/^pp_/, '').replace(/_/g, '-')
  const fees = await readPaymentFees(scope)
  const cfg = fees[normalized]
  if (!cfg || orderTotalMinor <= 0) return null

  const fixedInOrderCurrency =
    cfg.currency === orderCurrency
      ? cfg.fixedMinor
      : convertCurrencyAmount(cfg.fixedMinor, cfg.currency, orderCurrency, rates)

  const percentPart = Math.round((orderTotalMinor * cfg.percent) / 100)
  const feeMinor = Math.max(0, percentPart + Math.round(fixedInOrderCurrency || 0))
  return { ...cfg, provider: normalized, feeMinor }
}
