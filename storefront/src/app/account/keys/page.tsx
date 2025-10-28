'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'

export default function MyKeysPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-keys'],
    queryFn: async () => {
      const response = await api.get('/store/customers/me/digital-keys')
      return response.data.digital_keys
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d]">
        <div className="bg-[#15171c] border-b border-gray-800">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
              MY GAME KEYS 🔑
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="gaming-card p-8 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            MY GAME KEYS 🔑
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">Your digital game library</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {!data || data.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <div className="gaming-card p-12 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-full flex items-center justify-center text-7xl mx-auto mb-6">
                🎮
              </div>
              <h2 className="text-3xl font-black text-white mb-4">NO GAME KEYS YET</h2>
              <p className="text-gray-400 mb-8 text-lg">
                You haven't purchased any games yet. Start building your collection now!
              </p>
              <Link href="/products" className="btn-primary inline-block">
                BROWSE GAMES
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {data.map((key: any) => (
              <div
                key={key.id}
                className="gaming-card"
              >
                <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <div className="p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-black text-2xl text-white">GAME KEY</h3>
                        <span className={`px-4 py-1 rounded-full text-xs font-black ${
                          key.status === 'delivered' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500' 
                            : 'bg-gray-700 text-gray-400 border border-gray-600'
                        }`}>
                          {key.status === 'delivered' ? '✓ DELIVERED' : key.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {key.platform && (
                          <span className="flex items-center gap-2 text-gray-400">
                            <span className="font-bold text-[#ff6b35]">PLATFORM:</span> 
                            <span className="bg-[#1a1d24] px-3 py-1 rounded border border-gray-800">{key.platform}</span>
                          </span>
                        )}
                        {key.region && (
                          <span className="flex items-center gap-2 text-gray-400">
                            <span className="font-bold text-[#ff6b35]">REGION:</span>
                            <span className="bg-[#1a1d24] px-3 py-1 rounded border border-gray-800">{key.region}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Key Display */}
                  <div className="bg-[#1a1d24] border-2 border-[#ff6b35]/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-wide">Your Activation Key:</span>
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          navigator.clipboard.writeText(key.key_code)
                        }}
                        className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white px-4 py-2 rounded-lg text-xs font-black hover:shadow-lg hover:shadow-[#ff6b35]/50 transition-all uppercase"
                      >
                        📋 COPY KEY
                      </button>
                    </div>
                    <div className="font-mono text-2xl font-black text-white bg-[#0a0b0d] p-6 rounded-lg border border-gray-800 select-all break-all">
                      {key.key_code}
                    </div>
                  </div>

                  {key.delivered_at && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <span>🕐</span>
                      <span>Delivered: {new Date(key.delivered_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
