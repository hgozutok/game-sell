'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type SmtpSettings = {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  from_email: string
  from_name: string
  language: 'tr' | 'en'
}

type EmailTemplate = {
  id: string
  key: string
  locale: 'tr' | 'en' | string
  name: string
  subject: string
  html: string
  text?: string | null
  active: boolean
}

const emptyTemplate: EmailTemplate = {
  id: '',
  key: '',
  locale: 'tr',
  name: '',
  subject: '',
  html: '',
  text: '',
  active: true,
}

const PLACEHOLDERS = [
  '{{store_name}}',
  '{{support_email}}',
  '{{site_url}}',
  '{{customer_name}}',
  '{{order_number}}',
  '{{total}}',
  '{{currency}}',
  '{{keys_html}}',
  '{{items_html}}',
  '{{name}}',
  '{{email}}',
  '{{subject}}',
  '{{message}}',
  '{{now}}',
  '{{year}}',
]

export default function EmailSettingsPage() {
  const [tab, setTab] = useState<'smtp' | 'templates'>('smtp')
  const [smtp, setSmtp] = useState<SmtpSettings>({
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    from_email: '',
    from_name: '',
    language: 'tr',
  })
  const [password, setPassword] = useState('')
  const [passwordSet, setPasswordSet] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [smtpLoading, setSmtpLoading] = useState(true)
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpMessage, setSmtpMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [languageStatus, setLanguageStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [draft, setDraft] = useState<EmailTemplate>(emptyTemplate)
  const [isNew, setIsNew] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateMessage, setTemplateMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const loadSmtp = useCallback(async () => {
    setSmtpLoading(true)
    try {
      const res = await adminApi.get('/admin/email-settings')
      const s = res.data?.settings || {}
      setSmtp({
        enabled: s.enabled === true,
        host: s.host || '',
        port: Number(s.port) || 587,
        secure: s.secure === true,
        user: s.user || '',
        from_email: s.from_email || '',
        from_name: s.from_name || '',
        language: s.language === 'en' ? 'en' : 'tr',
      })
      setPasswordSet(Boolean(res.data?.password_set))
      if (s.from_email) setTestTo((prev) => prev || s.from_email)
    } catch (e: any) {
      setSmtpMessage({
        ok: false,
        text: e?.response?.data?.message || 'SMTP ayarları yüklenemedi',
      })
    } finally {
      setSmtpLoading(false)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const res = await adminApi.get('/admin/email-templates')
      const list: EmailTemplate[] = res.data?.templates || []
      setTemplates(list)
      setDraft((prev) => (prev.id || prev.key ? prev : (list[0] || prev)))
    } catch (e: any) {
      setTemplateMessage({
        ok: false,
        text: e?.response?.data?.message || 'Şablonlar yüklenemedi',
      })
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSmtp()
  }, [loadSmtp])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const changeLanguage = async (next: 'tr' | 'en') => {
    setSmtp((prev) => ({ ...prev, language: next }))
    setLanguageStatus('saving')
    try {
      // Dil secimi SMTP alanlarindan bagimsiz kaydedilir
      await adminApi.post('/admin/settings', {
        key: 'email.language',
        value: next,
        category: 'email',
      })
      setLanguageStatus('saved')
      setTimeout(() => setLanguageStatus('idle'), 2500)
    } catch {
      setLanguageStatus('error')
    }
  }

  const saveSmtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSmtpSaving(true)
    setSmtpMessage(null)
    try {
      await adminApi.post('/admin/email-settings', {
        ...smtp,
        password: password || undefined,
      })
      setPassword('')
      setSmtpMessage({ ok: true, text: 'SMTP ayarları kaydedildi.' })
      await loadSmtp()
    } catch (error: any) {
      setSmtpMessage({
        ok: false,
        text: error?.response?.data?.message || 'SMTP ayarları kaydedilemedi',
      })
    } finally {
      setSmtpSaving(false)
    }
  }

  const sendTest = async () => {
    if (!testTo.trim()) {
      setSmtpMessage({ ok: false, text: 'Test alıcı e-postası girin.' })
      return
    }
    setSmtpSaving(true)
    setSmtpMessage(null)
    try {
      const res = await adminApi.post('/admin/email-settings/test', { to: testTo.trim() })
      setSmtpMessage({ ok: true, text: res.data?.message || 'Test e-postası gönderildi.' })
    } catch (error: any) {
      setSmtpMessage({
        ok: false,
        text: error?.response?.data?.message || 'Test e-postası gönderilemedi',
      })
    } finally {
      setSmtpSaving(false)
    }
  }

  const selectTemplate = (template: EmailTemplate) => {
    setDraft({ ...template, text: template.text || '' })
    setIsNew(false)
    setPreviewHtml('')
    setPreviewSubject('')
    setTemplateMessage(null)
  }

  const newTemplate = () => {
    setDraft({ ...emptyTemplate })
    setIsNew(true)
    setPreviewHtml('')
    setPreviewSubject('')
    setTemplateMessage(null)
  }

  const saveTemplate = async () => {
    setTemplateSaving(true)
    setTemplateMessage(null)
    try {
      if (isNew) {
        await adminApi.post('/admin/email-templates', draft)
      } else {
        await adminApi.post(`/admin/email-templates/${draft.id}`, draft)
      }
      setTemplateMessage({ ok: true, text: 'Şablon kaydedildi.' })
      setIsNew(false)
      const res = await adminApi.get('/admin/email-templates')
      const list: EmailTemplate[] = res.data?.templates || []
      setTemplates(list)
      const saved = list.find(
        (t) => t.key === draft.key && (t.locale || 'tr') === (draft.locale || 'tr')
      )
      if (saved) setDraft({ ...saved, text: saved.text || '' })
    } catch (error: any) {
      setTemplateMessage({
        ok: false,
        text: error?.response?.data?.message || 'Şablon kaydedilemedi',
      })
    } finally {
      setTemplateSaving(false)
    }
  }

  const removeTemplate = async () => {
    if (!draft.id || isNew) return
    if (!confirm(`"${draft.name}" şablonunu silmek istiyor musunuz?`)) return
    setTemplateSaving(true)
    try {
      await adminApi.delete(`/admin/email-templates/${draft.id}`)
      setTemplateMessage({ ok: true, text: 'Şablon silindi.' })
      setDraft(emptyTemplate)
      setIsNew(false)
      const res = await adminApi.get('/admin/email-templates')
      setTemplates(res.data?.templates || [])
    } catch (error: any) {
      setTemplateMessage({
        ok: false,
        text: error?.response?.data?.message || 'Şablon silinemedi',
      })
    } finally {
      setTemplateSaving(false)
    }
  }

  const seedDefaults = async () => {
    setTemplateSaving(true)
    try {
      const res = await adminApi.post('/admin/email-templates/seed')
      setTemplateMessage({ ok: true, text: res.data?.message || 'Varsayılanlar yüklendi.' })
      const listRes = await adminApi.get('/admin/email-templates')
      setTemplates(listRes.data?.templates || [])
    } catch (error: any) {
      setTemplateMessage({
        ok: false,
        text: error?.response?.data?.message || 'Varsayılanlar yüklenemedi',
      })
    } finally {
      setTemplateSaving(false)
    }
  }

  const preview = async () => {
    setPreviewLoading(true)
    try {
      const res = await adminApi.post('/admin/email-templates/preview', {
        subject: draft.subject,
        html: draft.html,
      })
      setPreviewHtml(res.data?.html || '')
      setPreviewSubject(res.data?.subject || '')
    } catch (error: any) {
      setTemplateMessage({
        ok: false,
        text: error?.response?.data?.message || 'Önizleme oluşturulamadı',
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const activeTemplateKey = useMemo(() => (isNew ? '' : draft.id), [draft.id, isNew])

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">📧 E-posta Ayarları</h1>
            <p className="text-gray-400">SMTP bağlantısı ve düzenlenebilir mail şablonları</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('smtp')}
            className={`px-5 py-2 rounded-lg font-bold transition ${
              tab === 'smtp'
                ? 'bg-[#ff6b35] text-white'
                : 'bg-[#1a1d24] border border-gray-700 text-gray-300 hover:border-[#ff6b35]'
            }`}
          >
            SMTP Ayarları
          </button>
          <button
            onClick={() => setTab('templates')}
            className={`px-5 py-2 rounded-lg font-bold transition ${
              tab === 'templates'
                ? 'bg-[#ff6b35] text-white'
                : 'bg-[#1a1d24] border border-gray-700 text-gray-300 hover:border-[#ff6b35]'
            }`}
          >
            Mail Şablonları
          </button>
        </div>

        {tab === 'smtp' && (
          <div className="max-w-3xl space-y-6">
            {smtpMessage && (
              <div
                className={`border px-4 py-3 rounded-lg text-sm ${
                  smtpMessage.ok
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-red-500/10 border-red-500/40 text-red-400'
                }`}
              >
                {smtpMessage.text}
              </div>
            )}

            <form onSubmit={saveSmtp} className="gaming-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">SMTP Bağlantısı</h2>
                  <p className="text-sm text-gray-400">
                    Tüm mağaza e-postaları bu hesap üzerinden gönderilir.
                  </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smtp.enabled}
                    onChange={(e) => setSmtp({ ...smtp, enabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className={`text-sm font-bold ${smtp.enabled ? 'text-green-400' : 'text-gray-400'}`}>
                    {smtp.enabled ? 'Etkin' : 'Kapalı'}
                  </span>
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Sunucusu (host)</label>
                  <input
                    value={smtp.host}
                    onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
                  <input
                    type="number"
                    value={smtp.port}
                    onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Genelde 587 (STARTTLS) veya 465 (SSL)</p>
                </div>

                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtp.secure}
                      onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm text-gray-300">SSL/TLS (port 465 için işaretleyin)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Kullanıcı Adı</label>
                  <input
                    value={smtp.user}
                    onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                    placeholder="info@magaza.com"
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Şifre</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={passwordSet ? 'Kayıtlı — değiştirmek için yazın' : 'SMTP şifresi'}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gönderen E-posta</label>
                  <input
                    type="email"
                    value={smtp.from_email}
                    onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                    placeholder="siparis@magaza.com"
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gönderen Adı</label>
                  <input
                    value={smtp.from_name}
                    onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                    placeholder="HUPIPLAY"
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Varsayılan E-posta Dili
                  </label>
                  <select
                    value={smtp.language}
                    onChange={(e) =>
                      changeLanguage(e.target.value === 'en' ? 'en' : 'tr')
                    }
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  >
                    <option value="tr">Türkçe (TR)</option>
                    <option value="en">English (EN)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Müşteriye giden otomatik e-postalarda kullanılır. Değişiklik anında kaydedilir.
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      languageStatus === 'error' ? 'text-red-400' : 'text-green-400'
                    }`}
                    aria-live="polite"
                  >
                    {languageStatus === 'saving' && 'Kaydediliyor…'}
                    {languageStatus === 'saved' && '✓ Dil kaydedildi'}
                    {languageStatus === 'error' && 'Dil kaydedilemedi, tekrar deneyin'}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={smtpSaving}
                className="px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-50"
              >
                {smtpSaving ? 'Kaydediliyor…' : '💾 SMTP Ayarlarını Kaydet'}
              </button>
            </form>

            <div className="gaming-card p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Test E-postası</h2>
              <p className="text-sm text-gray-400">
                Kaydettiğiniz ayarlarla gerçek bir test maili gönderin.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={smtpSaving}
                  className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50"
                >
                  📨 Test Gönder
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div className="grid xl:grid-cols-4 gap-6 items-start">
            <div className="xl:col-span-1 gaming-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-white">Şablonlar</h2>
                <button
                  onClick={newTemplate}
                  className="text-xs px-2 py-1 bg-[#ff6b35] text-white rounded"
                >
                  + Yeni
                </button>
              </div>
              {templatesLoading ? (
                <div className="text-gray-400 text-sm py-4">Yükleniyor…</div>
              ) : (
                <div className="space-y-1">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        activeTemplateKey === template.id
                          ? 'bg-[#ff6b35]/15 text-[#ff6b35] border border-[#ff6b35]/40'
                          : 'text-gray-300 hover:bg-[#1a1d24] border border-transparent'
                      }`}
                    >
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {template.key} · {(template.locale || 'tr').toUpperCase()}
                      </div>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <div className="text-gray-400 text-sm">Henüz şablon yok.</div>
                  )}
                </div>
              )}
              <button
                onClick={seedDefaults}
                disabled={templateSaving}
                className="w-full mt-4 px-3 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg text-xs hover:border-[#ff6b35] disabled:opacity-50"
              >
                Varsayılanları Yükle
              </button>
            </div>

            <div className="xl:col-span-3 space-y-4">
              {templateMessage && (
                <div
                  className={`border px-4 py-3 rounded-lg text-sm ${
                    templateMessage.ok
                      ? 'bg-green-500/10 border-green-500/40 text-green-400'
                      : 'bg-red-500/10 border-red-500/40 text-red-400'
                  }`}
                >
                  {templateMessage.text}
                </div>
              )}

              <div className="gaming-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {isNew ? 'Yeni Şablon' : draft.name || 'Şablon'}
                  </h2>
                  {!isNew && draft.id && (
                    <button
                      onClick={removeTemplate}
                      disabled={templateSaving}
                      className="text-xs px-3 py-1 bg-red-500/15 border border-red-500/40 text-red-400 rounded disabled:opacity-50"
                    >
                      Sil
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Dil</label>
                    <select
                      value={(draft.locale as string) || 'tr'}
                      disabled={!isNew}
                      onChange={(e) =>
                        setDraft({ ...draft, locale: e.target.value === 'en' ? 'en' : 'tr' })
                      }
                      className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none disabled:opacity-60"
                    >
                      <option value="tr">Türkçe (TR)</option>
                      <option value="en">English (EN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Anahtar (key)</label>
                    <input
                      value={draft.key}
                      disabled={!isNew}
                      onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                      placeholder="order-digital-keys"
                      className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg font-mono text-sm focus:border-[#ff6b35] focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Ad</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Konu</label>
                    <input
                      value={draft.subject}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">HTML İçeriği</label>
                    <span className="text-xs text-gray-500">Değişkenler: {PLACEHOLDERS.slice(0, 4).join(' ')} …</span>
                  </div>
                  <textarea
                    value={draft.html}
                    onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                    rows={18}
                    spellCheck={false}
                    className="w-full px-4 py-3 bg-[#0f1116] border border-gray-700 text-gray-200 rounded-lg font-mono text-xs leading-relaxed focus:border-[#ff6b35] focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDraft({ ...draft, html: `${draft.html}${p}` })}
                        className="text-[11px] px-2 py-1 bg-[#1a1d24] border border-gray-700 text-gray-400 rounded hover:border-[#ff6b35] font-mono"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm text-gray-300">Aktif</span>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={saveTemplate}
                    disabled={templateSaving}
                    className="px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {templateSaving ? 'Kaydediliyor…' : '💾 Şablonu Kaydet'}
                  </button>
                  <button
                    onClick={preview}
                    disabled={previewLoading}
                    className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] disabled:opacity-50"
                  >
                    {previewLoading ? 'Hazırlanıyor…' : '👁 Önizle'}
                  </button>
                </div>
              </div>

              {previewHtml && (
                <div className="gaming-card p-4">
                  <div className="text-sm text-gray-400 mb-2">
                    Önizleme konusu: <span className="text-white">{previewSubject}</span>
                  </div>
                  <iframe
                    title="E-posta önizleme"
                    srcDoc={previewHtml}
                    sandbox=""
                    className="w-full bg-white rounded-lg"
                    style={{ height: 600, border: '1px solid #2a2d35' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
