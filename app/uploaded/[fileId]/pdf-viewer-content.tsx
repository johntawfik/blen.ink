"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import PDFViewerClient from "@/components/pdf-viewer-client"

export default function PDFViewerContent({ params }: { params: Promise<{ fileId: string }> }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    const handleParams = async () => {
      const { fileId } = await params
      
      // Construct the URL for the uploaded PDF
      const uploadedPdfUrl = `/api/pdf-upload/${fileId}`
      
      setPdfUrl(uploadedPdfUrl)
      setIsClient(true)
    }
    
    handleParams()
  }, [params])
  
  const startPage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">PDF Viewer</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          
          {isClient && pdfUrl ? (
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