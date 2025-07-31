import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'blen',
  description: 'A better way to read PDFs from the internet',
  generator: 'blen.ink',
  applicationName: 'blen',
  keywords: ['PDF', 'reader', 'document', 'online', 'viewer', 'reading'],
  authors: [{ name: 'blen team' }],
  creator: 'blen team',
  publisher: 'blen',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://blen.ink'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'blen',
    description: 'A better way to read PDFs from the internet',
    url: 'https://blen.ink',
    siteName: 'blen',
    images: [
      {
        url: '/leaf.png',
        width: 1200,
        height: 630,
        alt: 'blen - A better way to read PDFs from the internet',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'blen',
    description: 'A better way to read PDFs from the internet',
    creator: '@blen',
    images: ['/leaf.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
