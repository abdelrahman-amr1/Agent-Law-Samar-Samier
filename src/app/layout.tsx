import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سَنَد | شريكك القانوني الذكي',
  description: 'سَنَد هو شريكك القانوني الذكي لمساعدتك في صياغة مذكرات الدفاع وتحليل القضايا وتوفير الوقت',
  icons: {
    icon: '/icon.svg',
  },
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
