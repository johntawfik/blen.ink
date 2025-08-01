import React from "react"
import { Metadata } from "next"
import PDFViewerContent from "./pdf-viewer-content"

export async function generateMetadata({ params }: { params: Promise<{ url: string[] }> }): Promise<Metadata> {
  const { url } = await params
  const urlSegments = url as string[]
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

export default function PDFViewer({ params }: { params: Promise<{ url: string[] }> }) {
  return <PDFViewerContent params={params} />
} 