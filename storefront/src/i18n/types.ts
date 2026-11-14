import type { Locale } from './config'

/** Bir mesaj anahtarinin 5 dildeki karsiliklari. */
export type MessageEntry = Record<Locale, string>

/** Duzyazi anahtar -> diller. Cogul icin "|" ayirici kullanilir. */
export type MessageTable = Record<string, MessageEntry>

export type TVars = Record<string, string | number | undefined>
