import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS, getBlogPost } from '@/lib/blog-posts'

type Params = { slug: string }

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const post = getBlogPost(params.slug)
  if (!post) return { title: 'Article not found | HUPIPLAY' }
  return {
    title: `${post.title} | HUPIPLAY Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
    },
  }
}

export default function BlogPostPage({ params }: { params: Params }) {
  const post = getBlogPost(params.slug)
  if (!post) notFound()

  const related = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 3)

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className={`bg-gradient-to-br ${post.gradient} relative overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, rgba(255,255,255,.4), transparent 30%), radial-gradient(circle at 85% 70%, rgba(0,0,0,.55), transparent 45%)',
          }}
        />
        <div className="container mx-auto px-4 py-14 relative z-10">
          <div className="max-w-4xl mx-auto">
            <Link href="/blog" className="text-white/80 hover:text-white text-sm font-semibold">
              ← Back to blog
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 mt-6 mb-4">
              <span className="px-2 py-1 rounded bg-black/25 border border-white/25 font-bold uppercase tracking-wide">
                {post.category}
              </span>
              <span>{post.displayDate}</span>
              <span>·</span>
              <span>{post.readingTime}</span>
              <span>·</span>
              <span>{post.author}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">{post.title}</h1>
            <p className="text-lg md:text-xl text-white/85 max-w-3xl">{post.excerpt}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <article className="max-w-4xl mx-auto gaming-card p-6 md:p-10">
          <div
            className="prose prose-invert prose-lg max-w-none
              prose-headings:text-white prose-headings:font-black
              prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-li:text-gray-300 prose-strong:text-white
              prose-a:text-[#ff6b35] prose-a:no-underline hover:prose-a:underline
              prose-table:text-sm prose-th:text-white prose-td:text-gray-300
              prose-th:border-b prose-th:border-gray-700 prose-td:border-b prose-td:border-gray-800"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-10 pt-6 border-t border-gray-800 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-400">Buying a game key?</span>
            <Link href="/products" className="btn-primary px-5 py-2">
              Browse products
            </Link>
            <Link href="/deals" className="btn-secondary px-5 py-2">
              See deals
            </Link>
          </div>
        </article>

        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-black text-white mb-4">More from the blog</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="gaming-card p-5 hover:border-[#ff6b35] transition group"
              >
                <div className="text-xs text-[#ff6b35] font-bold mb-2">{item.category}</div>
                <div className="text-white font-bold leading-snug group-hover:text-[#ff6b35] transition-colors">
                  {item.title}
                </div>
                <div className="text-xs text-gray-500 mt-3">{item.readingTime}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
