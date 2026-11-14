import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { INTL_LOCALE } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export function generateMetadata() {
  const t = getServerT()
  return {
    title: t('legal.cookies.metaTitle'),
    description: t('legal.cookies.metaDescription'),
  }
}

/** Politikanin yururluk tarihi; her dilde ayni gunu gosterir. */
const LAST_UPDATED = new Date(2026, 10, 13)

export default function CookiesPage() {
  const t = getServerT()
  const locale = getServerLocale()
  const lastUpdated = new Intl.DateTimeFormat(
    `${INTL_LOCALE[locale].replace(/-u-.*$/, '')}-u-ca-gregory-nu-latn`,
    { dateStyle: 'long' }
  ).format(LAST_UPDATED)

  return (
    <PolicyLayout title={t('legal.cookies.title')} lastUpdated={lastUpdated}>
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            {t('legal.cookies.introA')}{' '}
            <Link href="/privacy" className="text-[#ff6b35] hover:underline">
              {t('legal.links.privacy')}
            </Link>
            {t('legal.cookies.introB')}
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s1.title')}</h2>
          <p className="mb-3">{t('legal.cookies.s1.p1')}</p>
          <p>{t('legal.cookies.s1.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s2.title')}</h2>
          <p className="mb-3">{t('legal.cookies.s2.p1')}</p>
          <p>{t('legal.cookies.s2.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s3.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800">
              <thead className="bg-[#1a1d24] text-white">
                <tr>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.cookies.s3.th1')}</th>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.cookies.s3.th2')}</th>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.cookies.s3.th3')}</th>
                  <th className="text-start p-3 border-b border-gray-800">{t('legal.cookies.s3.th4')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">cart-storage</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.type.local')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.r1c3')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.durCleared')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">NEXT_LOCALE</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.type.cookie')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.r2c3')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.durYear')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">currency-storage</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.type.local')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.r3c3')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.durCleared')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">customer_token</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.type.local')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.r4c3')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.durLogoutExpiry')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">
                    customer_id, customer_email, customer_first_name, customer_last_name
                  </td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.type.local')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.r5c3')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.durLogoutCleared')}</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">medusa_auth_token</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.type.local')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.r6c3')}</td>
                  <td className="p-3 border-b border-gray-800">{t('legal.cookies.s3.durLogoutExpiry')}</td>
                </tr>
                <tr>
                  <td className="p-3">
                    admin_token, admin_email, admin_authenticated, admin-tax-settings
                  </td>
                  <td className="p-3">{t('legal.cookies.s3.type.local')}</td>
                  <td className="p-3">{t('legal.cookies.s3.r7c3')}</td>
                  <td className="p-3">{t('legal.cookies.s3.durLogoutCleared')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-400">{t('legal.cookies.s3.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s4.title')}</h2>
          <p className="mb-3">{t('legal.cookies.s4.p1')}</p>
          <p>{t('legal.cookies.s4.p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s5.title')}</h2>
          <p>{t('legal.cookies.s5.p1')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s6.title')}</h2>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong className="text-white">{t('legal.cookies.s6.li1.label')}</strong>{' '}
              {t('legal.cookies.s6.li1.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.cookies.s6.li2.label')}</strong>{' '}
              {t('legal.cookies.s6.li2.text')}
            </li>
            <li>
              <strong className="text-white">{t('legal.cookies.s6.li3.label')}</strong>{' '}
              {t('legal.cookies.s6.li3.text')}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('legal.cookies.s7.title')}</h2>
          <p>
            {t('legal.cookies.s7.p1a')}{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            {t('legal.cookies.s7.p1b')}
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
