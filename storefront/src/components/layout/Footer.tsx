'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useT } from '@/components/useT'
import { api } from '@/lib/api'

const PAYMENT_BADGES: Record<string, string[]> = {
  stripe: ['VISA', 'MASTERCARD', 'AMEX'],
  paypal: ['PAYPAL'],
  mollie: ['IDEAL', 'BANCONTACT', 'SEPA', 'CARDS'],
  bank_transfer: ['BANK TRANSFER'],
  'bank-transfer': ['BANK TRANSFER'],
  crypto: ['CRYPTO'],
}

const BADGE_LABEL_KEYS: Record<string, string> = {
  'BANK TRANSFER': 'footer.badge.bankTransfer',
  CARDS: 'footer.badge.cards',
  CRYPTO: 'footer.badge.crypto',
}

// Footer'da gosterilecek sosyal medya kanallari. Admin panelden doldurulmayanlar gizlenir.
const SOCIAL_CHANNELS = [
  { id: 'facebook', label: 'Facebook', icon: 'f' },
  { id: 'instagram', label: 'Instagram', icon: 'IG' },
  { id: 'x', label: 'X', icon: '𝕏' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'in' },
  { id: 'youtube', label: 'YouTube', icon: 'YT' },
] as const

type SocialLink = { id: string; label: string; icon: string; href: string }

export default function Footer() {
  const t = useT()
  const [paymentBadges, setPaymentBadges] = useState<string[] | null>(null)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    api
      .get('/store/settings')
      .then((res) => {
        const social = res.data?.store?.social || {}
        const links: SocialLink[] = SOCIAL_CHANNELS.map((channel) => ({
          id: channel.id,
          label: channel.label,
          icon: channel.icon,
          href: typeof social[channel.id] === 'string' ? social[channel.id].trim() : '',
        })).filter((link) => /^https?:\/\//i.test(link.href))
        setSocialLinks(links)
      })
      .catch(() => setSocialLinks([]))
  }, [])

  useEffect(() => {
    api
      .get('/store/payment-methods')
      .then((res) => {
        const methods: Array<{ id: string }> = res.data?.methods || []
        const badges = new Set<string>()
        methods.forEach((method) => {
          const id = String(method.id || '').toLowerCase()
          const mapped = PAYMENT_BADGES[id] || []
          mapped.forEach((badge) => badges.add(badge))
        })
        setPaymentBadges(Array.from(badges))
      })
      .catch(() => {
        // Odeme ucu erisilemezse aktif oldugu bilinen havale ile devam et
        setPaymentBadges(['BANK TRANSFER'])
      })
  }, [])

  return (
    <footer className="bg-[#15171c] border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h3 className="text-2xl font-black text-white tracking-wider">
                  HUPI<span className="text-[#ff6b35]">PLAY</span>
                </h3>
                <p className="text-xs text-gray-500">{t('nav.brandTagline')}</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md text-sm leading-relaxed">
              {t('footer.description')}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    className="w-10 h-10 bg-[#1a1d24] hover:bg-[#ff6b35] rounded-lg flex items-center justify-center transition-all"
                  >
                    <span className="text-sm">{link.icon}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white uppercase text-sm">{t('footer.shop')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.allGames')}</Link></li>
              <li><Link href="/categories" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.categories')}</Link></li>
              <li><Link href="/deals" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.specialDeals')}</Link></li>
              <li><Link href="/products?filter=new" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.newReleases')}</Link></li>
              <li><Link href="/products?filter=featured" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.preorders')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white uppercase text-sm">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.helpCenter')}</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.contactUs')}</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.faq')}</Link></li>
              <li><Link href="/returns" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.returnsPolicy')}</Link></li>
              <li><Link href="/delivery" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.deliveryPolicy')}</Link></li>
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.howItWorks')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white uppercase text-sm">{t('footer.company')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.about')}</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.blog')}</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.privacy')}</Link></li>
              <li><Link href="/cookies" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.cookies')}</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-[#ff6b35] transition">{t('footer.terms')}</Link></li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <h4 className="text-white font-bold mb-4 text-sm uppercase">{t('footer.paymentsTitle')}</h4>
          <div className="flex flex-wrap gap-3">
            {paymentBadges === null ? (
              <div className="text-gray-500 text-xs">{t('footer.paymentsLoading')}</div>
            ) : paymentBadges.length > 0 ? (
              paymentBadges.map((method) => (
                <div key={method} className="bg-[#1a1d24] border border-gray-800 px-4 py-2 rounded-lg text-gray-400 text-xs font-bold">
                  {BADGE_LABEL_KEYS[method] ? t(BADGE_LABEL_KEYS[method]) : method}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-xs">{t('footer.paymentsEmpty')}</div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-gray-500">
              © {new Date().getFullYear()} HUPIPLAY. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-6 text-gray-500">
              <span className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {t('footer.secureCheckout')}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {t('footer.instantDelivery')}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {t('footer.bestPrices')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
