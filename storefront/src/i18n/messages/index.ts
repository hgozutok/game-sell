import type { MessageEntry } from '../types'
import { account } from './account'
import { auth } from './auth'
import { cart } from './cart'
import { catalog } from './catalog'
import { checkout } from './checkout'
import { common } from './common'
import { content } from './content'
import { errors } from './errors'
import { home } from './home'
import { legal } from './legal'

/**
 * Tum mesaj tablolari tek bir sozlukte birlestirilir.
 * Anahtarlar duz metindir; cogul icin "|" ayirici kullanilir.
 */
export const MESSAGES: Record<string, MessageEntry> = {
  ...common,
  ...home,
  ...catalog,
  ...cart,
  ...checkout,
  ...auth,
  ...account,
  ...errors,
  ...content,
  ...legal,
}

/** Ayni anahtarin iki farkli namespace'te tanimlanmasini yakalar (gelistirme uyarisi). */
export const MESSAGE_TABLES = { common, home, catalog, cart, checkout, auth, account, errors, content, legal }
