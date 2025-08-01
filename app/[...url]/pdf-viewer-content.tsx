"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import PDFViewerClient from "@/components/pdf-viewer-client"

export default function PDFViewerContent({ params }: { params: Promise<{ url: string[] }> }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  const [isFileUrl, setIsFileUrl] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    const handleParams = async () => {
      const { url } = await params
      const urlSegments = url as string[]
      
      // Handle both encoded URLs and direct PDF URLs
      let resolvedPdfUrl: string
      
      // If we have multiple segments, it's a direct URL like https://example.com/file.pdf
      // If we have one segment, it might be an encoded URL
      if (urlSegments.length === 1) {
        const singleSegment = urlSegments[0]
        try {
          // Try to decode the URL first (for encoded URLs from the search)
          const decodedUrl = decodeURIComponent(singleSegment)
          
          // Check if it's a file:// URL
          if (decodedUrl.startsWith('file://')) {
            setIsFileUrl(true)
            setIsClient(true)
            return
          }
          
          // Check if the decoded URL is a valid URL
          new URL(decodedUrl)
          resolvedPdfUrl = decodedUrl
        } catch {
          // If decoding fails, treat as a direct domain
          resolvedPdfUrl = singleSegment.startsWith('http') ? singleSegment : `https://${singleSegment}`
        }
      } else {
        // Multiple segments means it's a direct URL that was split by Next.js routing
        // Reconstruct the original URL
        if (urlSegments[0] === 'https:' || urlSegments[0] === 'http:') {
          // Handle protocol correctly - join with '/' but add extra '/' after protocol
          const protocol = urlSegments[0]
          const remainingSegments = urlSegments.slice(1).filter(segment => segment !== '') // Remove empty segments
          resolvedPdfUrl = `${protocol}//${remainingSegments.join('/')}`
        } else {
          // No protocol, add https and join all segments
          resolvedPdfUrl = `https://${urlSegments.join('/')}`
        }
      }
      
      setPdfUrl(resolvedPdfUrl)
      setIsClient(true)
    }
    
    handleParams()
  }, [params])
  
  const startPage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/pdf-upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Navigate to the uploaded PDF
        router.push(`/uploaded/${result.fileId}`)
      } else {
        alert(result.error || 'Failed to upload PDF')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload PDF')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  // Show file:// URL upload interface
  if (isFileUrl && isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

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

        {/* File URL Message */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div 
              className={`bg-white rounded-2xl p-8 shadow-lg text-center transition-all duration-200 ${
                isDragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragOver && (
                <div className="absolute inset-8 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl flex items-center justify-center z-10">
                  <div className="text-center text-blue-600">
                    <Upload className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Drop your PDF here</p>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-gray-600 text-lg">
                  Looks like you're trying to open a file from your computer. Want to upload and read it in Blen instead?
                </h3>
              </div>

              <Button
                onClick={openFileDialog}
                disabled={isUploading}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-3 mb-4"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Uploading PDF...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload PDF from your device
                  </>
                )}
              </Button>

              <p className="text-sm text-gray-500">
                Drop a PDF file here or click to browse • Your file will be uploaded securely and temporarily • Max 50MB
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

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