import React from "react"
import { Metadata } from "next"
import PDFViewerContent from "./pdf-viewer-content"

export async function generateMetadata({ params }: { params: Promise<{ fileId: string }> }): Promise<Metadata> {
  const { fileId } = await params
  
  const title = `Uploaded PDF - blen PDF Viewer`
  
  return {
    title,
    description: `Read your uploaded PDF with blen - A better way to read PDFs`,
    openGraph: {
      title,
      description: `Read your uploaded PDF with blen - A better way to read PDFs`,
      siteName: 'blen',
      type: 'article',
      images: ['/leaf.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: `Read your uploaded PDF with blen - A better way to read PDFs`,
      images: ['/leaf.png'],
    },
    robots: {
      index: false, 
      follow: false,
    },
  }
}

export default function UploadedPDFViewer({ params }: { params: Promise<{ fileId: string }> }) {
  return <PDFViewerContent params={params} />
} 