import Link from 'next/link'

interface PolicyLayoutProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export default function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Breadcrumb */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#ff6b35] transition">
              Home
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold">{title}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">{title}</h1>
            <p className="text-gray-400">Last Updated: {lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="gaming-card p-8 md:p-12">
            <div className="prose prose-invert prose-lg max-w-none">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
