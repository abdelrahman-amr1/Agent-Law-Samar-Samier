import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'المستشار القانوني الذكي',
  description: 'مساعد ذكي محترف لتحليل الدعاوي القضائية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
