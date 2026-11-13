import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | HUPIPLAY',
  description:
    'How HUPIPLAY collects, uses, stores and protects personal data under UK GDPR, EU GDPR and KVKK.',
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="13 November 2026">
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            This policy explains what personal data HUPIPLAY collects, why we collect it, who we share it
            with, how long we keep it and the rights you have. We are the data controller for the personal
            data described here.
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. Who we are</h2>
          <p className="mb-3">
            HUPIPLAY (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a trading name of{' '}
            <strong className="text-white">HUPI LIMITED</strong>, a company registered in England
            and Wales under company number <strong className="text-white">16664659</strong>, with
            its registered office at <strong className="text-white">Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA</strong>.
          </p>
          <p>
            Data protection contact:{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            . Please use the subject line &quot;Data Protection Request&quot;.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. Personal data we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Account and contact data:</strong> name, email address, password
              (stored in hashed form by our platform), preferred language and currency.
            </li>
            <li>
              <strong className="text-white">Order data:</strong> products purchased, order number, amounts,
              currency, billing country, delivery status and digital key delivery records.
            </li>
            <li>
              <strong className="text-white">Payment data:</strong> payment method, transaction reference and
              status. Card and bank details are processed by our payment providers; we do not store full card
              numbers or CVV codes.
            </li>
            <li>
              <strong className="text-white">Support data:</strong> messages you send through our contact form,
              email correspondence and any attachments you provide.
            </li>
            <li>
              <strong className="text-white">Technical data:</strong> IP address, device and browser type,
              approximate location derived from IP, pages visited, referring URL and security logs.
            </li>
            <li>
              <strong className="text-white">Marketing preferences:</strong> whether you have opted in to
              marketing emails and your interaction with those emails.
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-400">
            We do not intentionally collect special category data (for example health, religion or biometric
            data). Please do not send such data to us.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. Why we use your data and our lawful bases</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800">
              <thead className="bg-[#1a1d24] text-white">
                <tr>
                  <th className="text-left p-3 border-b border-gray-800">Purpose</th>
                  <th className="text-left p-3 border-b border-gray-800">Data used</th>
                  <th className="text-left p-3 border-b border-gray-800">Lawful basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-800">Creating and managing your account</td>
                  <td className="p-3 border-b border-gray-800">Account and contact data</td>
                  <td className="p-3 border-b border-gray-800">Performance of a contract</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">
                    Processing orders, payments, refunds and delivering digital keys
                  </td>
                  <td className="p-3 border-b border-gray-800">Order, payment and contact data</td>
                  <td className="p-3 border-b border-gray-800">Performance of a contract; legal obligation</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Customer support and complaint handling</td>
                  <td className="p-3 border-b border-gray-800">Contact, order and support data</td>
                  <td className="p-3 border-b border-gray-800">
                    Performance of a contract; legitimate interests
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Fraud prevention, chargeback defence and security</td>
                  <td className="p-3 border-b border-gray-800">Order, payment, technical data</td>
                  <td className="p-3 border-b border-gray-800">
                    Legitimate interests; legal obligation
                  </td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Service improvement and aggregate analytics</td>
                  <td className="p-3 border-b border-gray-800">Technical and usage data</td>
                  <td className="p-3 border-b border-gray-800">Legitimate interests</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-800">Marketing emails</td>
                  <td className="p-3 border-b border-gray-800">Contact and preference data</td>
                  <td className="p-3 border-b border-gray-800">Consent (or soft opt-in where permitted)</td>
                </tr>
                <tr>
                  <td className="p-3">Legal claims and regulatory compliance</td>
                  <td className="p-3">Relevant data</td>
                  <td className="p-3">Legal obligation; legitimate interests</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. Payments</h2>
          <p>
            Payments are processed by third-party payment providers such as Stripe, PayPal and Mollie, and by
            bank transfer for manually approved orders. These providers act as independent controllers or
            processors for payment data under their own privacy policies. We receive limited transaction
            information (for example payment status, amount, last four digits and fraud signals) so that we can
            complete your order, handle refunds and prevent fraud.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. Cookies and local storage</h2>
          <p>
            We use strictly necessary cookies and browser local storage to keep your cart, language, currency
            and login session working. Analytics or marketing cookies are used only with your consent. See our{' '}
            <Link href="/cookies" className="text-[#ff6b35] hover:underline">
              Cookie Policy
            </Link>{' '}
            for the full list and how to control them.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. Who we share data with</h2>
          <p className="mb-3">We share data only where necessary with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>hosting, database and infrastructure providers that operate the store;</li>
            <li>payment providers and banks to process payments and refunds;</li>
            <li>email delivery providers used to send order confirmations and digital keys;</li>
            <li>fraud prevention, chargeback and IT security providers;</li>
            <li>professional advisers (accountants, auditors, lawyers) under confidentiality duties;</li>
            <li>courts, regulators and law enforcement where required by law;</li>
            <li>a buyer or successor in the event of a business sale or restructuring.</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal data. We do not share your data with advertisers for their own
            marketing.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. International transfers</h2>
          <p>
            Some providers may process data outside the UK or European Economic Area. Where this happens, we
            rely on an adequacy decision or on appropriate safeguards such as the UK International Data
            Transfer Addendum or EU Standard Contractual Clauses, together with technical and organisational
            measures. You can request more information using the contact details below.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">8. How long we keep data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Account data:</strong> while your account is active, then up to 24
              months after the last activity.
            </li>
            <li>
              <strong className="text-white">Order, payment and tax records:</strong> normally 6 years from the
              end of the relevant tax year, or longer if required by law.
            </li>
            <li>
              <strong className="text-white">Support messages:</strong> up to 24 months after the matter is
              closed, unless needed for a legal claim.
            </li>
            <li>
              <strong className="text-white">Marketing preferences:</strong> until you withdraw consent, plus a
              suppression record so that we do not contact you again.
            </li>
            <li>
              <strong className="text-white">Security logs:</strong> normally up to 12 months.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">9. Security</h2>
          <p>
            We use encryption in transit (TLS), access controls, hashed passwords, encrypted storage of
            sensitive configuration, audit logs and least-privilege access. Payment card data is handled by our
            payment providers. No system is completely secure; if a breach affects your rights, we will notify
            you and the relevant regulator where required.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">10. Your rights</h2>
          <p className="mb-3">
            Subject to applicable law, you have the right to access, correct, delete, restrict or object to
            processing, to data portability, and to withdraw consent at any time. You also have the right not
            to be subject to solely automated decisions with legal or similarly significant effects.
          </p>
          <p className="mb-3">
            To exercise a right, email{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>{' '}
            with the subject &quot;Data Protection Request&quot;. We may ask for proof of identity. We normally
            respond within one month.
          </p>
          <p>
            If you are in the UK, you can complain to the Information Commissioner&apos;s Office (ICO) at{' '}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff6b35] hover:underline"
            >
              ico.org.uk
            </a>
            . If you are in the EU, you can complain to your local supervisory authority.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">11. If you are in Türkiye (KVKK)</h2>
          <p>
            Under Law No. 6698 on the Protection of Personal Data (KVKK), you may request information about
            whether your data is processed, request access, correction, deletion or anonymisation, object to
            processing, and claim compensation for damage caused by unlawful processing. Requests can be sent
            to{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            . Cross-border transfers are made using the mechanisms permitted by the KVKK.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">12. Marketing</h2>
          <p>
            We send marketing emails only with your consent, or where the soft opt-in applies to existing
            customers. Every marketing email includes an unsubscribe link. Unsubscribing does not stop
            transactional emails such as order confirmations and key delivery.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">13. Children</h2>
          <p>
            Our store is intended for adults. You must be at least 18 years old to create an account or
            purchase digital keys. We do not knowingly collect data from children. If you believe a child has
            provided data, contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">14. Changes to this policy</h2>
          <p>
            We may update this policy to reflect changes in our services or the law. The &quot;Last
            Updated&quot; date at the top shows the current version. Material changes will be communicated by
            email or a prominent notice on the store where appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">15. Contact</h2>
          <p>
            Questions about this policy or your data:{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            . Postal address: Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA.
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
