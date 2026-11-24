import type { Metadata } from 'next'
import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { INTL_LOCALE } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('legal.terms.metaTitle'),
    description: t('legal.terms.metaDescription'),
  }
}

/** Politikanin yururluk tarihi; her dilde ayni gunu gosterir. */
const LAST_UPDATED = new Date(2026, 10, 13)

export default async function TermsPage() {
  const t = await getServerT()
  const locale = await getServerLocale()
  const lastUpdated = new Intl.DateTimeFormat(
    `${INTL_LOCALE[locale].replace(/-u-.*$/, '')}-u-ca-gregory-nu-latn`,
    { dateStyle: 'long' }
  ).format(LAST_UPDATED)

  return (
    <PolicyLayout title={t('legal.terms.title')} lastUpdated={lastUpdated}>
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">{t('legal.terms.intro')}</p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s1.title')}</h2>
          <p className="mb-3">
            {t('legal.terms.s1.p1a')}{' '}
            <strong className="text-white">HUPI LIMITED</strong>
            {t('legal.terms.s1.p1b')}{' '}
            <strong className="text-white">16664659</strong>
            {t('legal.terms.s1.p1c')}{' '}
            <strong className="text-white">
              Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA
            </strong>
            {t('legal.terms.s1.p1d')}
          </p>
          <p>
            {t('legal.terms.s1.p2')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s2.title')}</h2>
          <p>
            {t('legal.terms.s2.p1a')}{' '}
            <Link href="/privacy" className="text-[#ff6b35] hover:underline">
              {t('legal.links.privacy')}
            </Link>
            {t('legal.punct.comma')}{' '}
            <Link href="/cookies" className="text-[#ff6b35] hover:underline">
              {t('legal.links.cookies')}
            </Link>{' '}
            {t('legal.terms.s2.p1c')}{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              {t('legal.links.returns')}
            </Link>
            {t('legal.terms.s2.p1d')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s3.title')}</h2>
          <p className="mb-3">{t('legal.terms.s3.p1')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('legal.terms.s3.li1')}</li>
            <li>{t('legal.terms.s3.li2')}</li>
            <li>{t('legal.terms.s3.li3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s4.title')}</h2>
          <p>{t('legal.terms.s4.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s5.title')}</h2>
          <p>{t('legal.terms.s5.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s6.title')}</h2>
          <p className="mb-3">{t('legal.terms.s6.p1')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('legal.terms.s6.li1')}</li>
            <li>{t('legal.terms.s6.li2')}</li>
            <li>{t('legal.terms.s6.li3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s7.title')}</h2>
          <p>
            {t('legal.terms.s7.p1a')}{' '}
            <Link href="/delivery" className="text-[#ff6b35] hover:underline">
              {t('legal.links.delivery')}
            </Link>
            {t('legal.terms.s7.p1b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s8.title')}</h2>
          <p className="mb-3">{t('legal.terms.s8.p1')}</p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-3">
            <p className="text-yellow-100">
              <strong>{t('legal.terms.s8.noteLabel')}</strong> {t('legal.terms.s8.noteText')}
            </p>
          </div>
          <p>
            {t('legal.terms.s8.p2a')}{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              {t('legal.links.returns')}
            </Link>
            {t('legal.terms.s8.p2b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s9.title')}</h2>
          <p className="mb-3">{t('legal.terms.s9.p1')}</p>
          <p className="mb-3">{t('legal.terms.s9.p2')}</p>
          <p>{t('legal.terms.s9.p3')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s10.title')}</h2>
          <p>
            {t('legal.terms.s10.p1a')}{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              {t('legal.links.returns')}
            </Link>
            {t('legal.terms.s10.p1b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s11.title')}</h2>
          <p className="mb-3">{t('legal.terms.s11.p1')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('legal.terms.s11.li1')}</li>
            <li>{t('legal.terms.s11.li2')}</li>
            <li>{t('legal.terms.s11.li3')}</li>
            <li>{t('legal.terms.s11.li4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s12.title')}</h2>
          <p className="mb-3">{t('legal.terms.s12.p1')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('legal.terms.s12.li1')}</li>
            <li>{t('legal.terms.s12.li2')}</li>
            <li>{t('legal.terms.s12.li3')}</li>
            <li>{t('legal.terms.s12.li4')}</li>
            <li>{t('legal.terms.s12.li5')}</li>
          </ul>
          <p className="mt-3">{t('legal.terms.s12.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s13.title')}</h2>
          <p>{t('legal.terms.s13.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s14.title')}</h2>
          <p className="mb-3">{t('legal.terms.s14.p1')}</p>
          <p>{t('legal.terms.s14.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s15.title')}</h2>
          <p>{t('legal.terms.s15.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s16.title')}</h2>
          <p className="mb-3">
            {t('legal.terms.s16.p1a')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            {t('legal.terms.s16.p1b')}
          </p>
          <p>{t('legal.terms.s16.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s17.title')}</h2>
          <p>{t('legal.terms.s17.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s18.title')}</h2>
          <p>{t('legal.terms.s18.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.terms.s19.title')}</h2>
          <p>
            HUPIPLAY, Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA.{' '}
            {t('legal.terms.s19.p1')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            .
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
