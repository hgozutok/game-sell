import type { Metadata } from 'next'
import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { INTL_LOCALE } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('legal.privacy.metaTitle'),
    description: t('legal.privacy.metaDescription'),
  }
}

/** Politikanin yururluk tarihi; her dilde ayni gunu gosterir. */
const LAST_UPDATED = new Date(2026, 10, 13)

export default async function PrivacyPolicyPage() {
  const t = await getServerT()
  const locale = await getServerLocale()
  const lastUpdated = new Intl.DateTimeFormat(
    `${INTL_LOCALE[locale].replace(/-u-.*$/, '')}-u-ca-gregory-nu-latn`,
    { dateStyle: 'long' }
  ).format(LAST_UPDATED)

  return (
    <PolicyLayout title={t('legal.privacy.title')} lastUpdated={lastUpdated}>
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">{t('legal.privacy.intro')}</p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s1.title')}</h2>
          <p className="mb-3">
            {t('legal.privacy.s1.p1a')}{' '}
            <strong className="text-white">HUPI LIMITED</strong>
            {t('legal.privacy.s1.p1b')}{' '}
            <strong className="text-white">16664659</strong>
            {t('legal.privacy.s1.p1c')}{' '}
            <strong className="text-white">
              Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA
            </strong>
            {t('legal.privacy.s1.p1d')}
          </p>
          <p>
            {t('legal.privacy.s1.p2a')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            {t('legal.privacy.s1.p2b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s2.title')}</h2>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong className="text-white">{t('legal.privacy.s2.li1.label')}</strong>{' '}
              {t('legal.privacy.s2.li1.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s2.li2.label')}</strong>{' '}
              {t('legal.privacy.s2.li2.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s2.li3.label')}</strong>{' '}
              {t('legal.privacy.s2.li3.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s2.li4.label')}</strong>{' '}
              {t('legal.privacy.s2.li4.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s2.li5.label')}</strong>{' '}
              {t('legal.privacy.s2.li5.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s2.li6.label')}</strong>{' '}
              {t('legal.privacy.s2.li6.text')}
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-400">{t('legal.privacy.s2.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s3.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800">
              <thead className="bg-[#1a1d24] text-white">
                <tr>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.privacy.s3.th1')}</th>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.privacy.s3.th2')}</th>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.privacy.s3.th3')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r1c1')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r1c2')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r1c3')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r2c1')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r2c2')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r2c3')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r3c1')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r3c2')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r3c3')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r4c1')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r4c2')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r4c3')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r5c1')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r5c2')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r5c3')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r6c1')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r6c2')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.privacy.s3.r6c3')}</td>
                </tr>
                <tr>
                  <td className="p-3">{t('legal.privacy.s3.r7c1')}</td>
                  <td className="p-3">{t('legal.privacy.s3.r7c2')}</td>
                  <td className="p-3">{t('legal.privacy.s3.r7c3')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s4.title')}</h2>
          <p>{t('legal.privacy.s4.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s5.title')}</h2>
          <p>
            {t('legal.privacy.s5.p1a')}{' '}
            <Link href="/cookies" className="text-[#ff6b35] hover:underline">
              {t('legal.links.cookies')}
            </Link>
            {t('legal.privacy.s5.p1b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s6.title')}</h2>
          <p className="mb-3">{t('legal.privacy.s6.p1')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('legal.privacy.s6.li1')}</li>
            <li>{t('legal.privacy.s6.li2')}</li>
            <li>{t('legal.privacy.s6.li3')}</li>
            <li>{t('legal.privacy.s6.li4')}</li>
            <li>{t('legal.privacy.s6.li5')}</li>
            <li>{t('legal.privacy.s6.li6')}</li>
            <li>{t('legal.privacy.s6.li7')}</li>
          </ul>
          <p className="mt-3">{t('legal.privacy.s6.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s7.title')}</h2>
          <p>{t('legal.privacy.s7.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s8.title')}</h2>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong className="text-white">{t('legal.privacy.s8.li1.label')}</strong>{' '}
              {t('legal.privacy.s8.li1.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s8.li2.label')}</strong>{' '}
              {t('legal.privacy.s8.li2.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s8.li3.label')}</strong>{' '}
              {t('legal.privacy.s8.li3.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s8.li4.label')}</strong>{' '}
              {t('legal.privacy.s8.li4.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.privacy.s8.li5.label')}</strong>{' '}
              {t('legal.privacy.s8.li5.text')}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s9.title')}</h2>
          <p>{t('legal.privacy.s9.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s10.title')}</h2>
          <p className="mb-3">{t('legal.privacy.s10.p1')}</p>
          <p className="mb-3">
            {t('legal.privacy.s10.p2a')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            {t('legal.privacy.s10.p2b')}
          </p>
          <p>
            {t('legal.privacy.s10.p3a')}{' '}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff6b35] hover:underline"
            >
              ico.org.uk
            </a>
            {t('legal.privacy.s10.p3b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s11.title')}</h2>
          <p>
            {t('legal.privacy.s11.p1a')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            {t('legal.privacy.s11.p1b')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s12.title')}</h2>
          <p>{t('legal.privacy.s12.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s13.title')}</h2>
          <p>{t('legal.privacy.s13.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s14.title')}</h2>
          <p>{t('legal.privacy.s14.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.privacy.s15.title')}</h2>
          <p>
            {t('legal.privacy.s15.p1a')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            {t('legal.privacy.s15.p1b')} Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole,
            England, BH16 6FA.
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
