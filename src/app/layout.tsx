
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Msarch App - Build Test',
  description: 'Testing the basic application structure.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
