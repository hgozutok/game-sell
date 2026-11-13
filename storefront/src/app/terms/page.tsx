import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | HUPIPLAY',
  description:
    'Terms of sale and use for digital game keys purchased from HUPIPLAY, including delivery, cancellation and consumer rights.',
}

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms of Service" lastUpdated="13 November 2026">
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            These terms govern your use of the HUPIPLAY store and the purchase of digital game keys. They do
            not affect your statutory consumer rights. Please read them before placing an order.
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. About us</h2>
          <p className="mb-3">
            HUPIPLAY is a trading name of <strong className="text-white">HUPI LIMITED</strong>, a
            company registered in England and Wales under company number{' '}
            <strong className="text-white">16664659</strong>, with its registered office at{' '}
            <strong className="text-white">Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA</strong>. VAT number: available on request.
          </p>
          <p>
            Contact:{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. These terms</h2>
          <p>
            By creating an account or placing an order you agree to these terms and to our{' '}
            <Link href="/privacy" className="text-[#ff6b35] hover:underline">
              Privacy Policy
            </Link>
            ,{' '}
            <Link href="/cookies" className="text-[#ff6b35] hover:underline">
              Cookie Policy
            </Link>{' '}
            and{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              Returns &amp; Refunds Policy
            </Link>
            . If you are a consumer, mandatory consumer law applies in addition to these terms. If you are a
            business customer, you confirm that you have authority to bind your business.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. Products</h2>
          <p className="mb-3">
            We sell digital licence keys and activation codes for third-party games and software. We are not
            the publisher or platform operator of those products.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Product pages show the platform, region and any known restrictions. You are responsible for
              checking that a key is compatible with your account, platform and region before ordering.
            </li>
            <li>
              Keys are sourced from authorised distributors and suppliers. We do not sell illegally obtained
              or stolen keys.
            </li>
            <li>
              Images and descriptions are provided for illustration. Minor differences in packaging, language
              or promotional content do not affect the key&apos;s functionality.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. Order and contract formation</h2>
          <p>
            Your order is an offer to buy. A contract is formed when we send an order confirmation email or
            deliver the key, whichever happens first. If we cannot accept an order (for example because of a
            pricing error, stock issue, fraud check or regional restriction), we will cancel it and refund any
            payment received. Prices and availability may change before acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. Price, currency and taxes</h2>
          <p>
            Prices are shown in the currency selected at checkout and include applicable taxes where required.
            Currency conversion rates are indicative and may be updated. Your bank or payment provider may
            apply its own conversion or cross-border fees, which we do not control.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. Payment</h2>
          <p className="mb-3">
            We accept card payments through Stripe, PayPal, Mollie and, where enabled, manual bank transfer.
            Payment must be authorised before keys are released.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Card payments may require 3-D Secure authentication.</li>
            <li>
              Bank transfer orders remain pending until the payment is received and verified. Keys are not
              released before verification.
            </li>
            <li>
              We may run fraud and sanctions checks and may request additional information before fulfilling an
              order.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. Delivery</h2>
          <p>
            Digital keys are delivered by email to the address provided at checkout, normally within minutes of
            payment approval. Delivery times, failed delivery and replacement are explained in our{' '}
            <Link href="/delivery" className="text-[#ff6b35] hover:underline">
              Delivery Policy
            </Link>
            . We do not ship physical goods.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">8. Right to cancel (14 days)</h2>
          <p className="mb-3">
            If you are a consumer in the UK or EU, you normally have 14 days from the day the contract is formed
            to cancel without giving a reason. However, digital content supplied immediately is different.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-3">
            <p className="text-yellow-100">
              <strong>Important:</strong> By placing an order and requesting immediate delivery, you expressly
              consent to the supply of digital content starting immediately and you acknowledge that you lose
              your right to cancel once the key has been revealed, downloaded or delivered. This does not
              affect your rights if the key is faulty, not as described or not supplied.
            </p>
          </div>
          <p>
            If you cancel before a key is revealed or delivered, contact us and we will refund the amount paid
            using the original payment method. See our{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              Returns &amp; Refunds Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">9. Faulty, invalid or misdescribed keys</h2>
          <p className="mb-3">
            We supply digital content that must be of satisfactory quality, fit for purpose and as described.
            If a key is invalid, already used, region-locked contrary to the product page, or otherwise not as
            described, contact us with your order number and evidence.
          </p>
          <p className="mb-3">
            Depending on the circumstances and your statutory rights, we will provide a replacement key, a
            repair or workaround, a price reduction, or a refund. Where a remedy is not possible or not
            provided within a reasonable time, you may be entitled to a full refund.
          </p>
          <p>
            Nothing in these terms excludes or limits your rights under the Consumer Rights Act 2015 or other
            mandatory consumer law.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">10. Refunds</h2>
          <p>
            Refunds are processed under our{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              Returns &amp; Refunds Policy
            </Link>
            . Approved refunds are returned to the original payment method. We do not charge restocking fees for
            faulty or misdescribed digital content.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">11. Accounts</h2>
          <p className="mb-3">If you create an account, you agree to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>provide accurate and complete information and keep it up to date;</li>
            <li>keep your password confidential and not share your account;</li>
            <li>notify us promptly of unauthorised access or suspicious activity;</li>
            <li>accept responsibility for activity carried out using your credentials, unless caused by our fault.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">12. Acceptable use</h2>
          <p className="mb-3">You must not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>use the store for fraud, money laundering or any unlawful purpose;</li>
            <li>resell keys at scale, scrape the store or use bots without our written permission;</li>
            <li>attempt to bypass payment, age or regional restrictions;</li>
            <li>interfere with the security or availability of the store;</li>
            <li>infringe our or a third party&apos;s intellectual property rights.</li>
          </ul>
          <p className="mt-3">
            We may suspend or close an account, cancel orders and report suspected fraud to the relevant
            authorities where necessary.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">13. Intellectual property</h2>
          <p>
            The store, its design, text, graphics and software are owned by us or our licensors and are protected
            by intellectual property laws. Game titles, logos and platform marks belong to their respective
            owners. You receive a licence to use the purchased key under the publisher&apos;s terms, not ownership
            of the underlying game.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">14. Our liability</h2>
          <p className="mb-3">
            We do not exclude or limit liability where it would be unlawful to do so, including liability for
            death or personal injury caused by negligence, fraud, or your statutory consumer rights.
          </p>
          <p>
            Subject to that, we are not liable for indirect or consequential losses, loss of profit, loss of
            data or business interruption. Our total liability for a claim relating to an order is limited to
            the amount you paid for that order, except where mandatory law provides otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">15. Events outside our control</h2>
          <p>
            We are not liable for delays or failures caused by events beyond our reasonable control, including
            platform outages, supplier failures, internet or payment network outages, strikes, natural
            disasters or regulatory action. We will take reasonable steps to minimise the impact and keep you
            informed.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">16. Complaints and alternative dispute resolution</h2>
          <p className="mb-3">
            If you are unhappy with an order or our service, contact us first at{' '}
            <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline">
              support@hupiplay.uk
            </a>
            . We aim to acknowledge complaints within 2 business days and resolve them within 14 days.
          </p>
          <p>
            If we cannot resolve a dispute, you may use an alternative dispute resolution (ADR) provider or the
            European Online Dispute Resolution platform where applicable. Using ADR is voluntary for both
            parties. Nothing prevents you from bringing a claim in court.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">17. Governing law and jurisdiction</h2>
          <p>
            These terms are governed by the laws of England and Wales. If you are a consumer, you also benefit
            from mandatory protections in your country of residence and may bring proceedings in your local
            courts. If you are a business, the courts of England and Wales have exclusive jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">18. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. The version in force at the time you place an order
            applies to that order. The &quot;Last Updated&quot; date shows the current version. Continued use of
            the store after changes means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">19. Contact</h2>
          <p>
            HUPIPLAY, Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA. Email:{' '}
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
