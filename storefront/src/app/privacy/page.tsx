import PolicyLayout from '@/components/layout/PolicyLayout'

export const metadata = {
  title: 'Privacy Policy | Digital Game Store',
  description: 'Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="October 27, 2025">
      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us when you create an account, make a purchase, or
            communicate with us. This may include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name and email address</li>
            <li>Billing information and payment details</li>
            <li>Order history and purchase information</li>
            <li>Communication preferences</li>
            <li>Customer support inquiries</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Process and fulfill your orders</li>
            <li>Send you game keys and order confirmations</li>
            <li>Provide customer support</li>
            <li>Send promotional emails (with your consent)</li>
            <li>Improve our services and user experience</li>
            <li>Prevent fraud and enhance security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. Information Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share your information
            with:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Payment processors to complete transactions</li>
            <li>Email service providers to send order confirmations</li>
            <li>Law enforcement when required by law</li>
            <li>Service providers who help operate our business</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction. All payment information is encrypted using
            SSL/TLS technology.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. Cookies</h2>
          <p className="mb-4">
            We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic,
            and understand where our visitors are coming from. You can control cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. Children's Privacy</h2>
          <p>
            Our services are not directed to individuals under the age of 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected such information, please contact us
            immediately.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new
            policy on this page and updating the "Last Updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
            <br />
            <a href="mailto:privacy@digitalgamestore.com" className="text-[#ff6b35] hover:underline">
              privacy@digitalgamestore.com
            </a>
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
