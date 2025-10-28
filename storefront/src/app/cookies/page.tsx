import PolicyLayout from '@/components/layout/PolicyLayout'

export const metadata = {
  title: 'Cookie Policy | Digital Game Store',
  description: 'Learn about how we use cookies on our website.',
}

export default function CookiesPage() {
  return (
    <PolicyLayout title="Cookie Policy" lastUpdated="October 27, 2025">
      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-3xl font-bold text-white mb-4">What Are Cookies?</h2>
          <p>
            Cookies are small text files that are placed on your computer or mobile device when you visit a website.
            They are widely used to make websites work more efficiently and provide information to website owners.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">How We Use Cookies</h2>
          <p className="mb-4">We use cookies for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Essential Cookies:</strong> Required for the website to function properly,
              including shopping cart and checkout processes
            </li>
            <li>
              <strong className="text-white">Performance Cookies:</strong> Help us understand how visitors interact with
              our website by collecting anonymous data
            </li>
            <li>
              <strong className="text-white">Functionality Cookies:</strong> Remember your preferences and settings to
              provide enhanced features
            </li>
            <li>
              <strong className="text-white">Marketing Cookies:</strong> Track your browsing activity to deliver
              relevant advertisements
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Types of Cookies We Use</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Session Cookies</h3>
              <p>Temporary cookies that expire when you close your browser. Used for shopping cart functionality.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Persistent Cookies</h3>
              <p>
                Remain on your device for a set period or until you delete them. Used to remember your preferences and
                login status.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Third-Party Cookies</h3>
              <p>
                Set by external services we use, such as payment processors and analytics providers (Google Analytics,
                payment gateways).
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Managing Cookies</h2>
          <p className="mb-4">
            You can control and manage cookies in your browser settings. However, please note that disabling cookies may
            affect the functionality of our website and limit your access to certain features.
          </p>
          <p className="mb-4">Most browsers allow you to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>View what cookies are stored and delete them individually</li>
            <li>Block third-party cookies</li>
            <li>Block all cookies from specific websites</li>
            <li>Block all cookies from all websites</li>
            <li>Delete all cookies when you close your browser</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Browser-Specific Instructions</h2>
          <div className="space-y-2">
            <p>
              <strong className="text-white">Google Chrome:</strong> Settings → Privacy and Security → Cookies and other
              site data
            </p>
            <p>
              <strong className="text-white">Mozilla Firefox:</strong> Settings → Privacy & Security → Cookies and Site
              Data
            </p>
            <p>
              <strong className="text-white">Safari:</strong> Preferences → Privacy → Manage Website Data
            </p>
            <p>
              <strong className="text-white">Microsoft Edge:</strong> Settings → Cookies and site permissions → Cookies
              and site data
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Analytics Cookies</h2>
          <p className="mb-4">We use analytics services to help us understand how visitors use our website:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Google Analytics: Tracks visitor behavior and website performance</li>
            <li>Payment Provider Analytics: Monitors transaction success rates and payment methods</li>
          </ul>
          <p className="mt-4">
            These services collect information anonymously and report website trends without identifying individual
            visitors.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated
            revision date.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Contact Us</h2>
          <p>
            If you have questions about our use of cookies, please contact us at:
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
