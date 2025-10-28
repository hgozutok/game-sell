'use client'

import { useState } from 'react'
import PolicyLayout from '@/components/layout/PolicyLayout'
import toast, { Toaster } from 'react-hot-toast'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Implement actual contact form submission
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success('Message sent successfully! We will get back to you soon.', {
        duration: 5000,
        style: {
          background: '#15171c',
          color: '#fff',
          border: '1px solid #ff6b35',
        },
      })

      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      toast.error('Failed to send message. Please try again.', {
        style: {
          background: '#15171c',
          color: '#fff',
          border: '1px solid #ff6b35',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      <Toaster position="top-right" />
      <PolicyLayout title="Contact Us" lastUpdated="October 27, 2025">
        <div className="space-y-8">
          <p className="text-gray-300 text-lg">
            Have a question or need assistance? We're here to help! Fill out the form below or use one of the other
            contact methods.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-white font-semibold mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-white font-semibold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-white font-semibold mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  >
                    <option value="">Select a subject</option>
                    <option value="order">Order Issue</option>
                    <option value="payment">Payment Question</option>
                    <option value="technical">Technical Support</option>
                    <option value="refund">Refund Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-white font-semibold mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none resize-none"
                    placeholder="Describe your issue or question in detail..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'SENDING...' : 'SEND MESSAGE'}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Other Ways to Reach Us</h2>

                <div className="space-y-4">
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">📧</div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Email Support</h3>
                        <p className="text-gray-400 mb-2">For general inquiries:</p>
                        <a
                          href="mailto:support@digitalgamestore.com"
                          className="text-[#ff6b35] hover:underline font-semibold"
                        >
                          support@digitalgamestore.com
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">💬</div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Live Chat</h3>
                        <p className="text-gray-400 mb-2">Available 24/7</p>
                        <button className="text-[#ff6b35] hover:underline font-semibold">
                          Start Live Chat →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">🕐</div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Response Time</h3>
                        <p className="text-gray-400">
                          We typically respond within <span className="text-white font-semibold">2-4 hours</span> during
                          business hours and <span className="text-white font-semibold">24 hours</span> on weekends.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#ff6b35]/20 to-[#f7931e]/20 border border-[#ff6b35]/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3">💡 Pro Tip</h3>
                <p className="text-gray-300">
                  Before contacting us, check our{' '}
                  <a href="/faq" className="text-[#ff6b35] hover:underline font-semibold">
                    FAQ page
                  </a>{' '}
                  - many common questions are answered there!
                </p>
              </div>
            </div>
          </div>
        </div>
      </PolicyLayout>
    </>
  )
}
