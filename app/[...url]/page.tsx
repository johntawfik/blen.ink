"use client"

import React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import PDFViewerClient from "@/components/pdf-viewer-client"
import { Metadata } from "next"

export function generateMetadata({ params }: { params: { url: string[] } }): Metadata {
  const urlSegments = params.url as string[]
  let pdfUrl: string
  let title: string
  
  if (urlSegments.length === 1) {
    const singleSegment = urlSegments[0]
    try {
      const decodedUrl = decodeURIComponent(singleSegment)
      new URL(decodedUrl)
      pdfUrl = decodedUrl
    } catch {
      pdfUrl = singleSegment.startsWith('http') ? singleSegment : `https://${singleSegment}`
    }
  } else {
    if (urlSegments[0] === 'https:' || urlSegments[0] === 'http:') {
      const protocol = urlSegments[0]
      const remainingSegments = urlSegments.slice(1).filter(segment => segment !== '')
      pdfUrl = `${protocol}//${remainingSegments.join('/')}`
    } else {
      pdfUrl = `https://${urlSegments.join('/')}`
    }
  }

  const fileName = pdfUrl.split('/').pop()?.replace(/\.(pdf|PDF)$/, '') || 'PDF Document'
  title = `${fileName} - blen PDF Viewer`
  
  return {
    title,
    description: `Read and view ${fileName} online with blen - A better way to read PDFs from the internet`,
    openGraph: {
      title,
      description: `Read and view ${fileName} online with blen - A better way to read PDFs from the internet`,
      url: `https://blen.ink/${encodeURIComponent(pdfUrl)}`,
      siteName: 'blen',
      type: 'article',
      images: ['/leaf.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `Read and view ${fileName} online with blen - A better way to read PDFs from the internet`,
      images: ['/leaf.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function PDFViewer() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Handle both encoded URLs and direct PDF URLs
  let pdfUrl: string
  const urlSegments = params.url as string[]
  
  // If we have multiple segments, it's a direct URL like https://example.com/file.pdf
  // If we have one segment, it might be an encoded URL
  if (urlSegments.length === 1) {
    const singleSegment = urlSegments[0]
    try {
      // Try to decode the URL first (for encoded URLs from the search)
      const decodedUrl = decodeURIComponent(singleSegment)
      // Check if the decoded URL is a valid URL
      new URL(decodedUrl)
      pdfUrl = decodedUrl
    } catch {
      // If decoding fails, treat as a direct domain
      pdfUrl = singleSegment.startsWith('http') ? singleSegment : `https://${singleSegment}`
    }
  } else {
    // Multiple segments means it's a direct URL that was split by Next.js routing
    // Reconstruct the original URL
    if (urlSegments[0] === 'https:' || urlSegments[0] === 'http:') {
      // Handle protocol correctly - join with '/' but add extra '/' after protocol
      const protocol = urlSegments[0]
      const remainingSegments = urlSegments.slice(1).filter(segment => segment !== '') // Remove empty segments
      pdfUrl = `${protocol}//${remainingSegments.join('/')}`
    } else {
      // No protocol, add https and join all segments
      pdfUrl = `https://${urlSegments.join('/')}`
    }
  }
  
  const startPage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">PDF Viewer</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          
          {isClient ? (
            <PDFViewerClient pdfUrl={pdfUrl} startPage={startPage} />
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-center py-12">
                <span className="text-gray-600">Loading...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 