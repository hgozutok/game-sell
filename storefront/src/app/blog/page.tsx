import type { Metadata } from 'next'
import Link from 'next/link'
import { formatDate } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'
import { BLOG_POSTS } from '@/lib/blog-posts'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('content.blog.metaTitle'),
    description: t('content.blog.metaDescription'),
  }
}

export default async function BlogIndexPage() {
  const t = await getServerT()
  const locale = await getServerLocale()
  const [featured, ...rest] = BLOG_POSTS

  // Ceviri yoksa Ingilizce kaynak metne don.
  const translateOr = (key: string, fallback: string) => {
    const value = t(key)
    return value === key ? fallback : value
  }

  const categoryLabel = (category: string) => {
    const slug = category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return translateOr(`content.blog.category.${slug}`, category)
  }

  const readingTimeLabel = (readingTime: string) => {
    const minutes = Number.parseInt(readingTime, 10)
    return Number.isFinite(minutes) && minutes > 0
      ? t('content.blog.readingTime', { count: minutes })
      : readingTime
  }

  const dateLabel = (date: string) =>
    formatDate(date, locale, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-gradient-to-br from-[#1a1d24] via-[#15171c] to-[#0a0b0d] border-b border-gray-800">
        <div className="container mx-auto px-4 py-14">
          <div className="max-w-4xl">
            <div className="inline-block mb-4 px-3 py-1 bg-[#ff6b35]/15 border border-[#ff6b35]/40 rounded-full text-xs font-bold text-[#ff6b35] uppercase tracking-wide">
              {t('content.blog.badge')}
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
              {t('content.blog.heroTitle')}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl">{t('content.blog.heroDesc')}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="group block gaming-card overflow-hidden mb-12 hover:border-[#ff6b35] transition"
          >
            <div className={`h-2 bg-gradient-to-r ${featured.gradient}`} />
            <div className="grid lg:grid-cols-2 gap-0">
              <div className={`relative min-h-[240px] bg-gradient-to-br ${featured.gradient} p-8 flex items-end`}>
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 35%), radial-gradient(circle at 80% 70%, rgba(0,0,0,.5), transparent 45%)',
                }} />
                <div className="relative z-10">
                  <div className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">
                    {t('content.blog.featured')}
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-white leading-tight">
                    {translateOr(`content.blog.post.${featured.slug}.title`, featured.title)}
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
                  <span className="px-2 py-1 rounded bg-[#ff6b35]/15 border border-[#ff6b35]/40 text-[#ff6b35] font-bold">
                    {categoryLabel(featured.category)}
                  </span>
                  <span>{dateLabel(featured.date)}</span>
                  <span>·</span>
                  <span>{readingTimeLabel(featured.readingTime)}</span>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {translateOr(`content.blog.post.${featured.slug}.excerpt`, featured.excerpt)}
                </p>
                <span className="text-[#ff6b35] font-bold inline-flex items-center gap-2 group-hover:gap-4 transition-all">
                  {t('content.blog.readArticle')} <span className="inline-block rtl:rotate-180">→</span>
                </span>
              </div>
            </div>
          </Link>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group gaming-card overflow-hidden hover:border-[#ff6b35] transition flex flex-col"
            >
              <div className={`h-2 bg-gradient-to-r ${post.gradient}`} />
              <div className="p-6 flex flex-col flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
                  <span className="px-2 py-1 rounded bg-[#1a1d24] border border-gray-700 text-gray-300 font-bold">
                    {categoryLabel(post.category)}
                  </span>
                  <span>{dateLabel(post.date)}</span>
                </div>
                <h2 className="text-xl font-black text-white mb-3 group-hover:text-[#ff6b35] transition-colors">
                  {translateOr(`content.blog.post.${post.slug}.title`, post.title)}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-5 flex-1">
                  {translateOr(`content.blog.post.${post.slug}.excerpt`, post.excerpt)}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{readingTimeLabel(post.readingTime)}</span>
                  <span className="text-[#ff6b35] font-bold group-hover:translate-x-1 transition-transform inline-block rtl:rotate-180">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
