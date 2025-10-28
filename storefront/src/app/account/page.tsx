'use client'

import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

const accountSections = [
  {
    title: 'MY KEYS',
    description: 'View your digital game keys',
    icon: '🔑',
    href: '/account/keys',
    gradient: 'from-[#ff6b35] to-[#f7931e]',
    featured: true
  },
  {
    title: 'ORDERS',
    description: 'View your order history',
    icon: '📦',
    href: '/account/orders',
    gradient: 'from-purple-600 to-pink-600'
  },
  {
    title: 'PROFILE',
    description: 'Manage your information',
    icon: '👤',
    href: '/account/profile',
    gradient: 'from-blue-600 to-cyan-600'
  },
  {
    title: 'WISHLIST',
    description: 'Games you want to buy',
    icon: '❤️',
    href: '/account/wishlist',
    gradient: 'from-red-600 to-pink-600'
  },
  {
    title: 'WALLET',
    description: 'Manage your balance',
    icon: '💳',
    href: '/account/wallet',
    gradient: 'from-green-600 to-emerald-600'
  },
  {
    title: 'SETTINGS',
    description: 'Account preferences',
    icon: '⚙️',
    href: '/account/settings',
    gradient: 'from-gray-600 to-slate-600'
  }
]

export default function AccountPage() {
  const { customer } = useAuth()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0b0d]">
        <div className="bg-[#15171c] border-b border-gray-800">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-full flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white">
                  Welcome, {customer?.first_name}!
                </h1>
                <p className="text-gray-400 text-sm">{customer?.email}</p>
              </div>
            </div>
            <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
            <p className="text-gray-400 text-lg">Manage your profile and gaming library</p>
          </div>
        </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accountSections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="group"
            >
              <div className={`gaming-card ${section.featured ? 'md:col-span-2 lg:col-span-1' : ''}`}>
                <div className={`h-2 bg-gradient-to-r ${section.gradient}`}></div>
                <div className="p-8">
                  <div className="text-6xl mb-4 transform group-hover:scale-125 transition-transform duration-300">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 group-hover:text-[#ff6b35] transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-gray-400 mb-4">{section.description}</p>
                  <div className="inline-flex items-center gap-2 text-[#ff6b35] font-bold group-hover:gap-4 transition-all">
                    MANAGE
                    <span>→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-black text-[#ff6b35] mb-1">0</div>
            <div className="text-xs text-gray-500 uppercase">Total Orders</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-black text-[#ff6b35] mb-1">0</div>
            <div className="text-xs text-gray-500 uppercase">Game Keys</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-black text-[#ff6b35] mb-1">0</div>
            <div className="text-xs text-gray-500 uppercase">Wishlist Items</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 text-center">
            <div className="text-3xl font-black text-[#ff6b35] mb-1">$0</div>
            <div className="text-xs text-gray-500 uppercase">Total Saved</div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
