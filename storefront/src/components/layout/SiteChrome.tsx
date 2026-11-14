'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'
import WhatsAppButton from '@/components/WhatsAppButton'

// Admin paneli magaza header/footer'i olmadan tam ekran calisir.
// Yonetim arayuzu Turkce oldugu icin Arapca seciminde bile LTR kalir.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin)
    return (
      <div dir="ltr" lang="tr">
        {children}
      </div>
    )

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
