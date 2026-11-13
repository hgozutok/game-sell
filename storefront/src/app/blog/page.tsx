import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog-posts'

export const metadata: Metadata = {
  title: 'Blog | HUPIPLAY',
  description:
    'GTA 6 news, launch guides, game recommendations and practical advice for buying digital game keys.',
}

export default function BlogIndexPage() {
  const [featured, ...rest] = BLOG_POSTS

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-gradient-to-br from-[#1a1d24] via-[#15171c] to-[#0a0b0d] border-b border-gray-800">
        <div className="container mx-auto px-4 py-14">
          <div className="max-w-4xl">
            <div className="inline-block mb-4 px-3 py-1 bg-[#ff6b35]/15 border border-[#ff6b35]/40 rounded-full text-xs font-bold text-[#ff6b35] uppercase tracking-wide">
              HUPIPLAY Blog
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
              GTA 6, game guides and key buying advice
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl">
              Straight answers about the biggest releases, platform and region compatibility, and getting the
              most out of your digital games.
            </p>
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
                  <div className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">Featured</div>
                  <div className="text-3xl md:text-4xl font-black text-white leading-tight">
                    {featured.title}
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
                  <span className="px-2 py-1 rounded bg-[#ff6b35]/15 border border-[#ff6b35]/40 text-[#ff6b35] font-bold">
                    {featured.category}
                  </span>
                  <span>{featured.displayDate}</span>
                  <span>·</span>
                  <span>{featured.readingTime}</span>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">{featured.excerpt}</p>
                <span className="text-[#ff6b35] font-bold inline-flex items-center gap-2 group-hover:gap-4 transition-all">
                  Read article <span>→</span>
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
                    {post.category}
                  </span>
                  <span>{post.displayDate}</span>
                </div>
                <h2 className="text-xl font-black text-white mb-3 group-hover:text-[#ff6b35] transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-5 flex-1">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{post.readingTime}</span>
                  <span className="text-[#ff6b35] font-bold group-hover:translate-x-1 transition-transform">
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
