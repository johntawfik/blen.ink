import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/react'
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'blen',
              description: 'A better way to read PDFs from the internet',
              url: 'https://blen.ink',
              applicationCategory: 'ProductivityApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              author: {
                '@type': 'Organization',
                name: 'blen team',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '150',
              },
            }),
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
