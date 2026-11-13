import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'Delivery Policy | HUPIPLAY',
  description:
    'How and when HUPIPLAY delivers digital game keys by email, what to do if a key does not arrive, and region restrictions.',
}

export default function DeliveryPage() {
  return (
    <PolicyLayout title="Delivery Policy" lastUpdated="13 November 2026">
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            HUPIPLAY sells digital products only. Nothing is shipped physically. Your key is delivered
            electronically to the email address you provide at checkout.
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. Delivery method</h2>
          <p>
            Digital keys are sent by email to the address entered in the checkout. The email contains your order
            number, the product name and the activation key. Keys are also available in your account under
            &quot;My Keys&quot; once the order has been fulfilled.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. Delivery times</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Card and instant payment methods:</strong> normally within a few
              minutes of payment approval, and usually within 30 minutes.
            </li>
            <li>
              <strong className="text-white">Bank transfer:</strong> keys are released only after the payment is
              received and verified. This can take 1–2 business days depending on your bank.
            </li>
            <li>
              <strong className="text-white">Manual review:</strong> some orders are held for fraud, stock or
              regional checks. If this happens, we will contact you and aim to resolve it within 1 business day.
            </li>
          </ul>
          <p className="mt-3">
            Delivery times are estimates, not guaranteed times, but we will always aim to deliver promptly.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. If the email does not arrive</h2>
          <p className="mb-3">Please check the following before contacting us:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>the spam, junk, promotions and quarantine folders;</li>
            <li>that the email address in your order is correct;</li>
            <li>that your mailbox is not full and can receive messages with attachments or links;</li>
            <li>your account page under &quot;My Keys&quot; — the key may already be there.</li>
          </ul>
          <p className="mt-3">
            If you still cannot find it, contact us with your order number. We can resend the email or provide
            the key through your account. We may ask you to verify your identity to protect the order.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. Wrong email address</h2>
          <p>
            You are responsible for entering the correct email address at checkout. If you entered the wrong
            address, contact us immediately. We will try to correct it before delivery. If the key has already
            been delivered to the wrong address, we cannot guarantee a replacement, but we will investigate and
            help where possible.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. Region, platform and activation restrictions</h2>
          <p>
            Product pages show the platform and region for each key. You must check compatibility before
            ordering. A key that cannot be activated because of a restriction clearly stated on the product page
            is not a delivery failure. If the restriction was not disclosed, please see our{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              Returns &amp; Refunds Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. Failed or delayed delivery</h2>
          <p className="mb-3">
            If a key cannot be delivered because of a supplier outage or stock issue, we will:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>keep you informed by email;</li>
            <li>offer an equivalent replacement key where possible;</li>
            <li>or cancel the order and refund the full amount if we cannot deliver within a reasonable time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. Risk and ownership</h2>
          <p>
            The key is delivered to you when it is sent to the email address in your order or made available in
            your account. From that point, you are responsible for keeping the key secure and for activating it
            in accordance with the publisher&apos;s terms. Do not share your key publicly.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">8. Business days</h2>
          <p>
            &quot;Business day&quot; means Monday to Friday, excluding public holidays in England and Wales.
            Delivery messages may still be sent outside business hours, but manual reviews and bank
            verifications take place on business days.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">9. Contact</h2>
          <p className="mb-4">
            For delivery problems, contact us with your order number and the email address used at checkout.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="btn-primary">
              Contact Support
            </Link>
            <a href="mailto:support@hupiplay.uk" className="btn-secondary">
              support@hupiplay.uk
            </a>
            <Link href="/faq" className="btn-secondary">
              Read FAQ
            </Link>
          </div>
        </section>
      </div>
    </PolicyLayout>
  )
}
