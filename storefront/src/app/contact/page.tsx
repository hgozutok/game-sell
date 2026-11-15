'use client'

import { useEffect, useState } from 'react'
import PolicyLayout from '@/components/layout/PolicyLayout'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'
import { useLocale } from '@/i18n/LocaleProvider'
import { formatDate } from '@/i18n'

export default function ContactPage() {
  const t = useT()
  const locale = useLocale()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)
  const [supportEmail, setSupportEmail] = useState('support@digitalgamestore.com')

  useEffect(() => {
    api
      .get('/store/settings')
      .then((res) => {
        const email = res.data?.store?.support_email
        if (email) setSupportEmail(email)
      })
      .catch(() => null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/store/contact', {
        name: formData.name,
        email: formData.email,
        subject: formData.subject || t('content.contact.subjectDefault'),
        message: formData.message,
      })

      toast.success(response.data?.message || t('content.contact.success'), {
        duration: 5000,
        style: {
          background: '#15171c',
          color: '#fff',
          border: '1px solid #ff6b35',
        },
      })

      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('content.contact.error'), {
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
      <PolicyLayout
        title={t('content.contact.title')}
        lastUpdated={formatDate('2025-10-27', locale, { day: 'numeric', month: 'long', year: 'numeric' })}
      >
        <div className="space-y-8">
          <p className="text-gray-300 text-lg">{t('content.contact.intro')}</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">{t('content.contact.formTitle')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-white font-semibold mb-2">
                    {t('content.contact.nameLabel')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    placeholder={t('content.contact.namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-white font-semibold mb-2">
                    {t('content.contact.emailLabel')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    placeholder={t('content.contact.emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-white font-semibold mb-2">
                    {t('content.contact.subjectLabel')}
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  >
                    <option value="">{t('content.contact.subjectPlaceholder')}</option>
                    <option value="order">{t('content.contact.optOrder')}</option>
                    <option value="payment">{t('content.contact.optPayment')}</option>
                    <option value="technical">{t('content.contact.optTechnical')}</option>
                    <option value="refund">{t('content.contact.optRefund')}</option>
                    <option value="other">{t('content.contact.optOther')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-white font-semibold mb-2">
                    {t('content.contact.msgLabel')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none resize-none"
                    placeholder={t('content.contact.msgPlaceholder')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('content.contact.submitSending') : t('content.contact.submitSend')}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">{t('content.contact.otherTitle')}</h2>

                <div className="space-y-4">
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">📧</div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {t('content.contact.emailSupportTitle')}
                        </h3>
                        <p className="text-gray-400 mb-2">{t('content.contact.emailSupportDesc')}</p>
                        <a
                          href={`mailto:${supportEmail}`}
                          className="text-[#ff6b35] hover:underline font-semibold"
                        >
                          {supportEmail}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">💬</div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {t('content.contact.liveChatTitle')}
                        </h3>
                        <p className="text-gray-400 mb-2">{t('content.contact.liveChatStatus')}</p>
                        <button className="text-[#ff6b35] hover:underline font-semibold">
                          {t('content.contact.liveChatCta')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">🕐</div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {t('content.contact.responseTitle')}
                        </h3>
                        <p className="text-gray-400">
                          {t('content.contact.responseStart')}{' '}
                          <span className="text-white font-semibold">{t('content.contact.responseHours')}</span>{' '}
                          {t('content.contact.responseMid')}{' '}
                          <span className="text-white font-semibold">
                            {t('content.contact.responseHoursWeekend')}
                          </span>{' '}
                          {t('content.contact.responseEnd')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#ff6b35]/20 to-[#f7931e]/20 border border-[#ff6b35]/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3">{t('content.contact.proTipTitle')}</h3>
                <p className="text-gray-300">
                  {t('content.contact.proTipText')}{' '}
                  <a href="/faq" className="text-[#ff6b35] hover:underline font-semibold">
                    {t('content.contact.proTipLink')}
                  </a>{' '}
                  {t('content.contact.proTipEnd')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PolicyLayout>
    </>
  )
}
