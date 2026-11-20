import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { formatDate } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export function generateMetadata() {
  const t = getServerT()
  return {
    title: t('content.digitalPolicy.metaTitle'),
    description: t('content.digitalPolicy.metaDescription'),
    alternates: {
      canonical: 'https://hupiplay.uk/digital-product-policy',
    },
    openGraph: {
      title: t('content.digitalPolicy.metaTitle'),
      description: t('content.digitalPolicy.metaDescription'),
      url: 'https://hupiplay.uk/digital-product-policy',
      siteName: 'HUPIPLAY',
      type: 'website',
    },
  }
}

export default function DigitalProductPolicyPage() {
  const t = getServerT()
  const locale = getServerLocale()

  return (
    <PolicyLayout
      title={t('content.digitalPolicy.title')}
      lastUpdated={formatDate('2026-11-20', locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
    >
      <div className="space-y-8 text-gray-300">
        {/* Giriş Bilgi Kutusu */}
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg leading-relaxed">{t('content.digitalPolicy.intro')}</p>
        </div>

        {/* 1. Bölüm: Dijital Anahtarların Niteliği */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('content.digitalPolicy.s1Title')}
          </h2>
          <p className="mb-3 leading-relaxed">{t('content.digitalPolicy.s1p1')}</p>
          <p className="leading-relaxed">{t('content.digitalPolicy.s1p2')}</p>
        </section>

        {/* 2. Bölüm: Teslimat Süreci ve Süreleri */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('content.digitalPolicy.s2Title')}
          </h2>
          <p className="mb-3 leading-relaxed">{t('content.digitalPolicy.s2p1')}</p>
          <ul className="list-disc ps-6 space-y-2 mb-4">
            <li>{t('content.digitalPolicy.s2b1')}</li>
            <li>{t('content.digitalPolicy.s2b2')}</li>
          </ul>
          <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
            <p className="text-sm leading-relaxed text-gray-400">
              {t('content.digitalPolicy.s2p2')}
            </p>
          </div>
        </section>

        {/* 3. Bölüm: Cayma Hakkı ve Yasal Feragat (Vurgulu Kutu) */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('content.digitalPolicy.s3Title')}
          </h2>
          <p className="mb-3 leading-relaxed">{t('content.digitalPolicy.s3p1')}</p>
          <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-xl font-bold">⚠️</span>
              <p className="text-yellow-100 text-sm leading-relaxed font-medium">
                {t('content.digitalPolicy.s3p2')}
              </p>
            </div>
          </div>
        </section>

        {/* 4. Bölüm: Bölge Uyumluluğu ve Platform Kısıtlamaları */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('content.digitalPolicy.s4Title')}
          </h2>
          <p className="mb-3 leading-relaxed">{t('content.digitalPolicy.s4p1')}</p>
          <ul className="list-disc ps-6 space-y-2 mb-3">
            <li>{t('content.digitalPolicy.s4b1')}</li>
            <li>{t('content.digitalPolicy.s4b2')}</li>
          </ul>
          <p className="leading-relaxed">{t('content.digitalPolicy.s4p2')}</p>
        </section>

        {/* 5. Bölüm: %100 Çalışma ve Değişim Garantisi */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('content.digitalPolicy.s5Title')}
          </h2>
          <p className="mb-4 leading-relaxed">{t('content.digitalPolicy.s5p1')}</p>
          <div className="space-y-3 mb-4">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-[#ff6b35] font-bold text-lg">1.</span>
              <p className="text-sm">{t('content.digitalPolicy.s5b1')}</p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-[#ff6b35] font-bold text-lg">2.</span>
              <p className="text-sm">{t('content.digitalPolicy.s5b2')}</p>
            </div>
            <div className="bg-[#1a1d24] border border-green-500/30 rounded-lg p-4 flex items-start gap-3 bg-green-500/5">
              <span className="text-green-400 font-bold text-lg">✓</span>
              <p className="text-sm text-green-200">{t('content.digitalPolicy.s5b3')}</p>
            </div>
          </div>
        </section>

        {/* 6. Bölüm: Tek Kullanımlık Lisanslar ve Müşteri Sorumluluğu */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('content.digitalPolicy.s6Title')}
          </h2>
          <p className="mb-3 leading-relaxed">{t('content.digitalPolicy.s6p1')}</p>
          <p className="leading-relaxed">{t('content.digitalPolicy.s6p2')}</p>
        </section>

        {/* 7. Bölüm: Destek ve İletişim */}
        <section className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            {t('content.digitalPolicy.supportTitle')}
          </h3>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            {t('content.digitalPolicy.supportText')}
          </p>
          <Link href="/contact" className="btn-primary inline-block">
            {t('content.shared.contactSupport')}
          </Link>
        </section>
      </div>
    </PolicyLayout>
  )
}
