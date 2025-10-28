import PolicyLayout from '@/components/layout/PolicyLayout'

export const metadata = {
  title: 'Terms of Service | Digital Game Store',
  description: 'Read our terms and conditions for using our digital game store.',
}

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms of Service" lastUpdated="October 27, 2025">
      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Digital Game Store, you accept and agree to be bound by the terms and provision of
            this agreement. If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">2. Digital Product Sales</h2>
          <p className="mb-4">
            All products sold on our platform are digital game keys. By purchasing from us, you acknowledge that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Digital keys are delivered electronically via email</li>
            <li>Keys are region-specific and platform-specific as indicated</li>
            <li>Once a key is revealed or activated, it cannot be returned</li>
            <li>You are responsible for activating keys before any expiration date</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">3. Account Responsibilities</h2>
          <p className="mb-4">When you create an account, you agree to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your password</li>
            <li>Not share your account with others</li>
            <li>Notify us immediately of any unauthorized use</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">4. Payment Terms</h2>
          <p className="mb-4">
            All prices are listed in the currency specified on the product page. Payment is processed immediately upon
            order completion. We accept various payment methods including credit cards, PayPal, and other approved
            payment processors.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">5. Refund Policy</h2>
          <p className="mb-4">Refunds are available under the following conditions:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The game key is defective or invalid</li>
            <li>The wrong product was delivered</li>
            <li>The key has not been activated or revealed</li>
            <li>Request is made within 24 hours of purchase</li>
          </ul>
          <p className="mt-4">
            No refunds will be issued for keys that have been activated, used, or if you simply changed your mind.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">6. Prohibited Activities</h2>
          <p className="mb-4">You may not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Resell or redistribute game keys purchased from our platform</li>
            <li>Use our service for fraudulent purposes</li>
            <li>Attempt to circumvent payment systems</li>
            <li>Use automated systems or bots to access our service</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">7. Intellectual Property</h2>
          <p>
            All content on this website, including text, graphics, logos, and software, is the property of Digital Game
            Store or its content suppliers and is protected by copyright laws.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">8. Limitation of Liability</h2>
          <p>
            Digital Game Store shall not be liable for any indirect, incidental, special, consequential, or punitive
            damages resulting from your use of or inability to use the service.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting.
            Your continued use of the service after changes constitutes acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">10. Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:
            <br />
            <a href="mailto:legal@digitalgamestore.com" className="text-[#ff6b35] hover:underline">
              legal@digitalgamestore.com
            </a>
          </p>
        </section>
      </div>
    </PolicyLayout>
  )
}
