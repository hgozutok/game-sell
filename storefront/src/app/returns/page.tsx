import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'Returns & Refunds Policy | HUPIPLAY',
  description:
    'Refund and cancellation rights for digital game keys bought from HUPIPLAY, including faulty keys and the 14-day consumer right to cancel.',
}

export default function ReturnsPage() {
  return (
    <PolicyLayout title="Returns & Refunds Policy" lastUpdated="13 November 2026">
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            This policy explains when you can cancel an order or obtain a refund for digital game keys. It sits
            alongside your statutory rights and does not replace them.
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. Your statutory rights</h2>
          <p className="mb-3">
            If you are a consumer in the UK, digital content must be of satisfactory quality, fit for purpose and
            as described. If a key does not meet these standards, you may be entitled to a repair, replacement,
            price reduction or refund under the Consumer Rights Act 2015.
          </p>
          <p>
            Nothing in this policy excludes or limits those rights. If you are in the EU, equivalent mandatory
            consumer protections apply.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. 14-day right to cancel</h2>
          <p className="mb-3">
            Consumers in the UK and EU normally have 14 days from the day the contract is formed to cancel an
            online purchase without giving a reason (Consumer Contracts Regulations 2013).
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-3">
            <p className="text-yellow-100">
              <strong>Digital content exception:</strong> when you place an order and ask for immediate
              delivery, you expressly consent to the digital content being supplied straight away and you
              acknowledge that you lose the right to cancel once the key has been revealed, downloaded or
              delivered. This exception does not apply if the key is faulty, not as described or not supplied.
            </p>
          </div>
          <p>
            If you cancel before the key is revealed or delivered, we will refund the full amount paid using the
            original payment method.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. When we will refund or replace a key</h2>
          <div className="space-y-3">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Invalid or already-used key:</strong>
                <p className="text-sm">
                  The key cannot be activated, has already been redeemed, or is rejected by the platform.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Wrong product or edition:</strong>
                <p className="text-sm">We delivered a different game, platform or edition than you ordered.</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Region restriction contrary to the listing:</strong>
                <p className="text-sm">
                  The key cannot be activated in the region stated on the product page at the time of purchase.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Key not delivered:</strong>
                <p className="text-sm">
                  You paid but did not receive the key and we cannot resolve it within a reasonable time.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Cancellation before delivery:</strong>
                <p className="text-sm">You cancel before the key is revealed or delivered.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. When a refund is not available</h2>
          <div className="space-y-3">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Key already revealed or activated:</strong>
                <p className="text-sm">
                  Once a key has been revealed, downloaded or redeemed, it cannot be returned simply because you
                  changed your mind. This does not affect rights for faulty or misdescribed keys.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Wrong region or platform chosen by mistake:</strong>
                <p className="text-sm">
                  Please check the platform and region on the product page before ordering. We may still help
                  where the key is unused and the publisher permits a transfer, but this is not guaranteed.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Device or system incompatibility:</strong>
                <p className="text-sm">
                  Your device does not meet the game&apos;s published requirements. This is not a defect in the
                  key.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Abuse or breach of terms:</strong>
                <p className="text-sm">
                  The order was obtained through fraud, payment abuse or a breach of our Terms of Service.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. How to request a refund or replacement</h2>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">Step 1: Gather your details</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Order number and the email address used at checkout</li>
                <li>The key or a screenshot of the activation error</li>
                <li>A short description of the problem and what you have tried</li>
                <li>Confirmation that the key has not been used, where relevant</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">Step 2: Contact us</h3>
              <p className="mb-4">
                Use the contact form or email us. We aim to acknowledge requests within 2 business days and
                resolve them within 14 days.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="btn-secondary">
                  Contact Form
                </Link>
                <a href="mailto:support@hupiplay.uk" className="btn-secondary">
                  support@hupiplay.uk
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">Step 3: Review and remedy</h3>
              <p>
                We will investigate with the supplier and may ask for additional evidence. Where a defect is
                confirmed, we will offer a replacement key first where available, then a refund if a replacement
                is not possible or does not resolve the issue.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. Refund timing and method</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Refunds are made to the original payment method wherever possible.</li>
            <li>We process approved refunds within 5 business days of approval.</li>
            <li>
              Card refunds usually appear within 3–5 business days; PayPal within 1–3 business days; bank
              transfers may take 5–7 business days. Your provider may add further delay.
            </li>
            <li>We do not deduct fees for faulty or misdescribed digital content.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. Chargebacks and payment disputes</h2>
          <p className="mb-4">
            Please contact us before opening a chargeback or payment dispute. We can usually resolve key and
            delivery issues faster directly. If you open a dispute without contacting us, we may need to provide
            the payment provider with order and delivery evidence, and your account may be temporarily limited
            while the dispute is investigated.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-200">
              <strong>Important:</strong> Opening a chargeback does not remove your statutory rights, but it can
              lengthen the resolution process.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">8. Questions</h2>
          <p className="mb-4">
            If anything is unclear, contact us before ordering or as soon as a problem appears.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="btn-primary">
              Contact Support
            </Link>
            <Link href="/faq" className="btn-secondary">
              Read FAQ
            </Link>
            <Link href="/terms" className="btn-secondary">
              Terms of Service
            </Link>
          </div>
        </section>
      </div>
    </PolicyLayout>
  )
}
