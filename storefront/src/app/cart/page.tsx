"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { useCurrencyStore } from "@/store/currencyStore"

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore()
  const { selectedCurrency } = useCurrencyStore()
  
  const isEmpty = items.length === 0
  const totalPrice = getTotalPrice()

  const formatPrice = (amount: number) => {
    return `${selectedCurrency.symbol}${(amount / 100).toFixed(2)}`
  }

  const handleCheckout = () => {
    router.push('/checkout')
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#0a0b0d]">
        <div className="bg-[#15171c] border-b border-gray-800">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
              SHOPPING CART
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="gaming-card p-12 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-[#ff6b35]/20 to-[#f7931e]/20 rounded-full flex items-center justify-center text-7xl mx-auto mb-6">
                🛒
              </div>
              <h2 className="text-3xl font-black text-white mb-4">YOUR CART IS EMPTY</h2>
              <p className="text-gray-400 mb-8 text-lg">
                Start shopping and add some amazing games to your cart!
              </p>
              <Link href="/products" className="btn-primary inline-block">
                BROWSE GAMES
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-gray-100">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
                SHOPPING CART
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
            </div>
            <p className="text-xl text-gray-400">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.variantId} className="gaming-card p-6">
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.thumbnail || "/placeholder-game.jpg"}
                      alt={item.title}
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-game.jpg"
                      }}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link
                          href={`/products/${item.handle || item.productId}`}
                          className="text-xl font-bold text-white hover:text-[#ff6b35] transition-colors"
                        >
                          {item.title}
                        </Link>
                        <div className="flex gap-2 mt-2">
                          {item.metadata?.platform && (
                            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full">
                              {item.metadata.platform}
                            </span>
                          )}
                          {item.metadata?.region && (
                            <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full">
                              {item.metadata.region}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove from cart"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <label className="text-gray-400 font-semibold">Quantity:</label>
                        <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="px-4 py-2 bg-[#1a1d24] hover:bg-[#202329] transition-colors"
                          >
                            -
                          </button>
                          <span className="px-6 py-2 bg-[#15171c]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="px-4 py-2 bg-[#1a1d24] hover:bg-[#202329] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#ff6b35]">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPrice(item.price)} each
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="gaming-card p-8 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-semibold">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">Tax</span>
                  <span className="text-white font-semibold">$0.00</span>
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-[#ff6b35]">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full btn-primary mb-4 py-4"
              >
                Proceed to Checkout
              </button>

              <Link
                href="/products"
                className="block text-center text-[#ff6b35] hover:text-[#ff7b45] font-semibold"
              >
                Continue Shopping
              </Link>

              <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="font-bold text-white mb-3">Secure Checkout</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>SSL Encrypted Payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Instant Digital Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
