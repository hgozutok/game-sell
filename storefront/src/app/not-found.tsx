'use client'

import Link from 'next/link'
import { useT } from '@/components/useT'

export default function NotFound() {
  const t = useT()

  return (
    <div className="min-h-[70vh] bg-[#0a0b0d] flex items-center justify-center px-4 py-20">
      <div className="max-w-xl w-full text-center">
        <div className="text-8xl mb-4">🎮</div>
        <div className="text-[#ff6b35] font-black text-6xl mb-2">404</div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">{t('notFound.title')}</h1>
        <p className="text-gray-400 mb-8">{t('notFound.description')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary px-6 py-3">
            {t('notFound.home')}
          </Link>
          <Link
            href="/products"
            className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            {t('notFound.allGames')}
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            {t('notFound.support')}
          </Link>
        </div>
      </div>
    </div>
  )
}
