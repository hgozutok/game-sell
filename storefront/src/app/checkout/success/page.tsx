'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Order {
  id: string
  display_id: number
  created_at: string
  total: number
  currency_code: string
  items: Array<{
    title: string
    quantity: number
    metadata?: {
      digital_key?: string
    }
  }>
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get(`/store/orders/${orderId}`)
        setOrder(response.data.order)
      } catch (error) {
        console.error('Failed to fetch order:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-4">ORDER SUCCESSFUL! 🎉</h1>
            <p className="text-xl text-gray-300 mb-2">Thank you for your purchase!</p>
            {order && (
              <p className="text-gray-400">
                Order #{order.display_id} • {new Date(order.created_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* What Happens Next */}
          <div className="gaming-card p-8 mb-6">
            <h2 className="text-2xl font-black text-white mb-6">📧 WHAT HAPPENS NEXT?</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Check Your Email</h3>
                  <p className="text-gray-400 text-sm">
                    We've sent your game keys and order confirmation to your email address. Check your inbox (and spam
                    folder) now!
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">View Your Keys</h3>
                  <p className="text-gray-400 text-sm">
                    You can also access your keys anytime from your account dashboard under "My Orders".
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Activate & Play!</h3>
                  <p className="text-gray-400 text-sm">
                    Follow the activation instructions included with your key to start playing immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          {order && (
            <div className="gaming-card p-8 mb-6">
              <h2 className="text-2xl font-black text-white mb-6">📦 ORDER DETAILS</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="bg-[#1a1d24] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                      </div>
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        DELIVERED
                      </span>
                    </div>
                    {item.metadata?.digital_key && (
                      <div className="mt-3 bg-[#0a0b0d] border border-gray-700 rounded p-3">
                        <div className="text-xs text-gray-500 mb-1">GAME KEY:</div>
                        <div className="font-mono text-[#ff6b35] text-lg font-bold">{item.metadata.digital_key}</div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold text-white">
                    <span>Total Paid:</span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.currency_code,
                      }).format(order.total / 100)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/account/orders" className="btn-primary text-center">
              VIEW ALL ORDERS
            </Link>
            <Link href="/products" className="btn-secondary text-center">
              CONTINUE SHOPPING
            </Link>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
            <h3 className="font-bold text-white mb-2">Need Help?</h3>
            <p className="text-gray-400 text-sm mb-4">
              If you didn't receive your keys or have any issues, our support team is here to help 24/7.
            </p>
            <Link href="/contact" className="text-[#ff6b35] hover:underline font-semibold">
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
