'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface Slide {
  id: string
  title: string
  subtitle: string
  image_url: string
  link_url: string
  button_text: string
  order: number
  is_active: boolean
}

export default function SliderManagementPage() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const response = await adminApi.get('/admin/slider')
      setSlides(response.data.slides || [])
    } catch (error) {
      console.error('Failed to fetch slides:', error)
      // If endpoint doesn't exist or fails, use empty array
      setSlides([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (slide: Slide) => {
    try {
      if (slide.id && slide.id.startsWith('new')) {
        await adminApi.post('/admin/slider', slide)
      } else {
        await adminApi.put(`/admin/slider/${slide.id}`, slide)
      }
      fetchSlides()
      setEditingSlide(null)
      alert('✅ Slider başarıyla kaydedildi!')
    } catch (error) {
      console.error('Failed to save slide:', error)
      alert('❌ Slider kaydedilemedi. Backend endpoint hazır değil.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu slider\'ı silmek istediğinizden emin misiniz?')) return
    
    try {
      await adminApi.delete(`/admin/slider/${id}`)
      fetchSlides()
      alert('✅ Slider silindi!')
    } catch (error) {
      console.error('Failed to delete slide:', error)
      alert('❌ Slider silinemedi. Backend endpoint hazır değil.')
    }
  }

  const addNewSlide = () => {
    setEditingSlide({
      id: 'new-' + Date.now(),
      title: '',
      subtitle: '',
      image_url: '',
      link_url: '',
      button_text: 'Shop Now',
      order: slides.length,
      is_active: true,
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-gray-400 hover:text-white">
                ← Geri
              </Link>
              <div>
                <h1 className="text-3xl font-black text-white">🖼️ Slider Yönetimi</h1>
                <p className="text-gray-400">Ana sayfa slider düzenle</p>
              </div>
            </div>
            <button
              onClick={addNewSlide}
              className="px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition"
            >
              + Yeni Slider Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6b35] mx-auto"></div>
          </div>
        ) : slides.length === 0 && !editingSlide ? (
          <div className="gaming-card p-12 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-2xl font-bold text-white mb-2">Henüz slider yok</h3>
            <p className="text-gray-400 mb-6">Ana sayfa için slider ekleyin</p>
            <button
              onClick={addNewSlide}
              className="px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition"
            >
              İlk Slider'ı Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {slides.map((slide) => (
              <div key={slide.id} className="gaming-card p-6">
                <div className="flex items-start gap-6">
                  <div className="w-48 h-32 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {slide.image_url ? (
                      <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        Görsel Yok
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{slide.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">{slide.subtitle}</p>
                    <div className="flex gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${slide.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'}`}>
                        {slide.is_active ? '✅ Aktif' : '❌ Pasif'}
                      </span>
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                        Sıra: {slide.order}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Link: {slide.link_url}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSlide(slide)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingSlide && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="gaming-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-white mb-6">
                {editingSlide.id.startsWith('new') ? 'Yeni Slider' : 'Slider Düzenle'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Başlık</label>
                  <input
                    type="text"
                    value={editingSlide.title}
                    onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Alt Başlık</label>
                  <input
                    type="text"
                    value={editingSlide.subtitle}
                    onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Görsel URL</label>
                  <input
                    type="url"
                    value={editingSlide.image_url}
                    onChange={(e) => setEditingSlide({ ...editingSlide, image_url: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Link URL</label>
                  <input
                    type="text"
                    value={editingSlide.link_url}
                    onChange={(e) => setEditingSlide({ ...editingSlide, link_url: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    placeholder="/products"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Buton Yazısı</label>
                  <input
                    type="text"
                    value={editingSlide.button_text}
                    onChange={(e) => setEditingSlide({ ...editingSlide, button_text: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sıralama</label>
                  <input
                    type="number"
                    value={editingSlide.order}
                    onChange={(e) => setEditingSlide({ ...editingSlide, order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSlide.is_active}
                    onChange={(e) => setEditingSlide({ ...editingSlide, is_active: e.target.checked })}
                    className="w-5 h-5 bg-[#1a1d24] border border-gray-700 rounded text-[#ff6b35] focus:ring-[#ff6b35]"
                  />
                  <span className="text-white font-medium">Aktif</span>
                </label>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSave(editingSlide)}
                  className="flex-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-lg transition"
                >
                  💾 Kaydet
                </button>
                <button
                  onClick={() => setEditingSlide(null)}
                  className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

