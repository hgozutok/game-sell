import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us | HUPIPLAY',
  description:
    'HUPIPLAY is the trading name of HUPI LIMITED (company number 16664659), a UK-registered digital game key store.',
}

const COMPANY = {
  legalName: 'HUPI LIMITED',
  number: '16664659',
  incorporated: '21 August 2025',
  address:
    'Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA',
}

const ACTIVITIES = [
  {
    code: '47910',
    title: 'Online retail',
    description: 'Retail sale via mail order houses or via the internet — the core of our digital store.',
  },
  {
    code: '46900',
    title: 'Wholesale trade',
    description: 'Non-specialised wholesale trade, supporting our sourcing and supplier relationships.',
  },
  {
    code: '46190',
    title: 'Sales agency',
    description: 'Agents involved in the sale of a variety of goods.',
  },
  {
    code: '62012',
    title: 'Software development',
    description: 'Business and domestic software development, including the systems behind the store.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1a1d24] via-[#15171c] to-[#0a0b0d] border-b border-gray-800 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#ff6b35] rounded-full filter blur-[140px] opacity-20" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-700 rounded-full filter blur-[140px] opacity-20" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-[#ff6b35]/15 border border-[#ff6b35]/40 rounded-full text-xs font-bold text-[#ff6b35]">
              HUPI LIMITED · Company No. {COMPANY.number}
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-5">
              About HUPIPLAY
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl leading-relaxed">
              A UK-registered digital game store built around one simple idea: buy a key, receive it
              immediately, and get real support if something goes wrong.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-14 max-w-5xl space-y-12">
        {/* Story + company card */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-3 space-y-5 text-gray-300 leading-relaxed">
            <h2 className="text-3xl font-black text-white">Who we are</h2>
            <p>
              <strong className="text-white">HUPIPLAY</strong> is the trading name of{' '}
              <strong className="text-white">{COMPANY.legalName}</strong>, a private limited company
              registered in England and Wales. The company was incorporated on{' '}
              <strong className="text-white">{COMPANY.incorporated}</strong> and operates from its
              registered office in Poole, England.
            </p>
            <p>
              We sell digital licence keys for PC and console games. Orders are delivered electronically,
              usually within minutes of payment approval, and keys are also available in your account under
              “My Keys”. We do not ship discs or physical goods.
            </p>
            <p>
              Our catalogue is aimed at players who want a straightforward alternative to hunting across
              storefronts: clear platform and region information, transparent pricing, and a support team you
              can actually reach.
            </p>
            <p>
              Keys are sourced through authorised distributors and suppliers. We do not sell illegally
              obtained or stolen keys, and we investigate any supplier or delivery issue that affects a
              customer order.
            </p>

            <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5 text-sm">
              <p className="text-gray-400">
                Company information is published on the UK Companies House register. Company number:{' '}
                <strong className="text-white font-mono">{COMPANY.number}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <section>
          <h2 className="text-3xl font-black text-white mb-6">What we stand for</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '⚡',
                title: 'Delivery that respects your time',
                text: 'Digital keys should arrive when you buy them. We automate delivery, monitor fulfilment and step in manually when an order needs attention.',
              },
              {
                icon: '🔍',
                title: 'Clear platform and region info',
                text: 'A key is only useful if it works on your account. We show the platform and region on product pages so you can check before you pay.',
              },
              {
                icon: '🛡️',
                title: 'Support and accountability',
                text: 'Orders, refunds and faulty keys are handled by people, not endless forms. We publish our policies and honour your statutory rights.',
              },
            ].map((value) => (
              <div key={value.title} className="gaming-card p-6">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{value.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Registered activities */}
        <section>
          <h2 className="text-3xl font-black text-white mb-3">Our registered activities</h2>
          <p className="text-gray-400 mb-6 max-w-3xl">
            HUPI LIMITED’s registered SIC codes reflect the different parts of the business: online retail,
            wholesale sourcing and the software that runs the store.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {ACTIVITIES.map((activity) => (
              <div key={activity.code} className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-[#ff6b35]/15 border border-[#ff6b35]/30 text-[#ff6b35]">
                    {activity.code}
                  </span>
                  <h3 className="font-bold text-white">{activity.title}</h3>
                </div>
                <p className="text-sm text-gray-400">{activity.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="gaming-card p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-black text-white mb-3">Talk to us</h2>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Questions about an order, a key or a refund? Contact us with your order number and the email
                address used at checkout.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  Email:{' '}
                  <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline font-semibold">
                    support@hupiplay.uk
                  </a>
                </p>
                <p className="text-gray-300">
                  Registered office: <span className="text-white">{COMPANY.address}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row md:justify-end gap-3">
              <Link href="/contact" className="btn-primary px-6 py-3 text-center">
                Contact support
              </Link>
              <Link href="/products" className="btn-secondary px-6 py-3 text-center">
                Browse games
              </Link>
            </div>
          </div>
        </section>

        <p className="text-xs text-gray-500">
          Company information is based on the public Companies House register for company number 16664659. For
          purchases, our{' '}
          <Link href="/terms" className="text-[#ff6b35] hover:underline">
            Terms of Service
          </Link>
          ,{' '}
          <Link href="/privacy" className="text-[#ff6b35] hover:underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/returns" className="text-[#ff6b35] hover:underline">
            Returns &amp; Refunds Policy
          </Link>{' '}
          apply.
        </p>
      </div>
    </div>
  )
}
