import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseCheck } from '@/components/auth/SupabaseCheck'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Ordus - Legal Practice Management',
  description: 'Next-generation legal practice management software',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QueryProvider>
          <SupabaseCheck>
            <AuthProvider>{children}</AuthProvider>
          </SupabaseCheck>
        </QueryProvider>
      </body>
    </html>
  )
}
