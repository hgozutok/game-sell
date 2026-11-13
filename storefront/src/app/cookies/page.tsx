import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'Cookie Policy | HUPIPLAY',
  description:
    'How HUPIPLAY uses cookies and browser storage, the categories we use, and how you can control them.',
}

export default function CookiesPage() {
  return (
    <PolicyLayout title="Cookie Policy" lastUpdated="13 November 2026">
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            This policy explains how we use cookies and similar technologies such as browser local storage. It
            should be read together with our{' '}
            <Link href="/privacy" className="text-[#ff6b35] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. What are cookies and local storage?</h2>
          <p className="mb-3">
            Cookies are small text files stored on your device by a website. Local storage is a browser feature
            that lets a site store data on your device without an expiry date until you clear it. Both are used
            to remember your choices and keep the store working.
          </p>
          <p>
            We use the term &quot;cookies&quot; below to cover cookies, local storage and similar technologies.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. Your choices</h2>
          <p className="mb-3">
            Strictly necessary cookies do not require consent because the store cannot work without them. Any
            analytics or marketing cookies are used only with your consent, in line with the UK Privacy and
            Electronic Communications Regulations (PECR) and, where applicable, EU ePrivacy rules.
          </p>
          <p>
            You can clear or block cookies through your browser settings. Blocking necessary cookies may stop
            the cart, login or checkout from working.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. Strictly necessary cookies and storage we use</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800">
              <thead className="bg-[#1a1d24] text-white">
                <tr>
                  <th className="text-left p-3 border-b border-gray-800">Name</th>
                  <th className="text-left p-3 border-b border-gray-800">Type</th>
                  <th className="text-left p-3 border-b border-gray-800">Purpose</th>
                  <th className="text-left p-3 border-b border-gray-800">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">cart-storage</td>
                  <td className="p-3 border-b border-gray-800">Local storage</td>
                  <td className="p-3 border-b border-gray-800">Keeps the items in your shopping cart</td>
                  <td className="p-3 border-b border-gray-800">Until cleared</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">language-storage</td>
                  <td className="p-3 border-b border-gray-800">Local storage</td>
                  <td className="p-3 border-b border-gray-800">Remembers your language (TR/EN)</td>
                  <td className="p-3 border-b border-gray-800">Until cleared</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">currency-storage</td>
                  <td className="p-3 border-b border-gray-800">Local storage</td>
                  <td className="p-3 border-b border-gray-800">Remembers your selected currency</td>
                  <td className="p-3 border-b border-gray-800">Until cleared</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">customer_token</td>
                  <td className="p-3 border-b border-gray-800">Local storage</td>
                  <td className="p-3 border-b border-gray-800">Keeps you signed in to your customer account</td>
                  <td className="p-3 border-b border-gray-800">Until logout or expiry</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">
                    customer_id, customer_email, customer_first_name, customer_last_name
                  </td>
                  <td className="p-3 border-b border-gray-800">Local storage</td>
                  <td className="p-3 border-b border-gray-800">
                    Displays your account details and pre-fills checkout
                  </td>
                  <td className="p-3 border-b border-gray-800">Until logout or cleared</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800 font-mono">medusa_auth_token</td>
                  <td className="p-3 border-b border-gray-800">Local storage</td>
                  <td className="p-3 border-b border-gray-800">Authenticates store requests</td>
                  <td className="p-3 border-b border-gray-800">Until logout or expiry</td>
                </tr>
                <tr>
                  <td className="p-3">
                    admin_token, admin_email, admin_authenticated, admin-tax-settings
                  </td>
                  <td className="p-3">Local storage</td>
                  <td className="p-3">Admin panel session and settings (admin users only)</td>
                  <td className="p-3">Until logout or cleared</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            These items are set by our own store. They are not used for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. Analytics and marketing cookies</h2>
          <p className="mb-3">
            We do not currently run third-party advertising or behavioural profiling cookies on the store. If we
            introduce analytics or marketing tools, we will update this policy and ask for your consent before
            setting non-essential cookies.
          </p>
          <p>
            Aggregate server logs may be used to understand traffic and prevent abuse; these are described in
            our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. Third-party cookies on payment pages</h2>
          <p>
            When you choose a payment method, you may be redirected to or use an embedded checkout from Stripe,
            PayPal or Mollie. Those providers may set their own cookies and process data under their privacy and
            cookie policies. We do not control those cookies. Please review the relevant provider&apos;s policy
            before paying.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. How to manage cookies</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Browser settings:</strong> most browsers let you view, delete and
              block cookies. Use the help section of your browser for instructions.
            </li>
            <li>
              <strong className="text-white">Local storage:</strong> you can clear site data for this store in
              your browser&apos;s privacy settings.
            </li>
            <li>
              <strong className="text-white">Do Not Track:</strong> we do not currently respond to browser
              Do-Not-Track signals because no uniform standard exists, but we do not run non-essential tracking
              cookies without consent.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. Changes and contact</h2>
          <p>
            We may update this policy when our use of cookies changes. The &quot;Last Updated&quot; date shows
            the current version. Questions:{' '}
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
