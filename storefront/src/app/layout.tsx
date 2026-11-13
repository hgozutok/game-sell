import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import SiteChrome from '@/components/layout/SiteChrome'
import LangAttribute from '@/components/LangAttribute'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Digital Game Store - Buy Game Keys Instantly',
  description: 'Purchase digital game keys for PC, PlayStation, Xbox and more. Instant delivery to your email.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-[#0a0b0d]`}>
        <Providers>
          <LangAttribute />
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  )
}

