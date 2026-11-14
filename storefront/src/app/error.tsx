'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useT } from '@/components/useT'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Uygulama hatasi:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] bg-[#0a0b0d] flex items-center justify-center px-4 py-20">
      <div className="max-w-xl w-full text-center">
        <div className="text-8xl mb-4">🛠️</div>
        <div className="text-[#ff6b35] font-black text-6xl mb-2">500</div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">{t('error.title')}</h1>
        <p className="text-gray-400 mb-2">{t('error.description')}</p>
        {error?.digest && (
          <p className="text-xs text-gray-600 mb-6 font-mono">{t('error.code', { code: error.digest })}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => reset()} className="btn-primary px-6 py-3">
            {t('error.retry')}
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            {t('error.home')}
          </Link>
          <Link
            href="/products"
            className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            {t('error.allGames')}
          </Link>
        </div>
      </div>
    </div>
  )
}
