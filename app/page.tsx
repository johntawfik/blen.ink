"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUp, BookOpen, Upload, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import ReadingList from "@/components/reading-list"
import { readingProgress } from "@/lib/reading-progress"

export default function DupeApp() {
  const [searchValue, setSearchValue] = useState("")
  const [showReadingList, setShowReadingList] = useState(false)
  const [hasBooks, setHasBooks] = useState(false)
  const [showImageBackground, setShowImageBackground] = useState(true)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Check if user has any books on load
  useEffect(() => {
    const sessions = readingProgress.getAllSessions()
    setHasBooks(sessions.length > 0)
    // Start with landing page by default, user can choose to view reading list
    setShowReadingList(false)
  }, [])

  // Handle the fade effect timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowImageBackground(false)
    }, 3500) // Show image for 3.5 seconds, then start fade

    return () => clearTimeout(timer)
  }, [])

  const handleSearch = () => {
    if (searchValue.trim()) {
      // Check if it's a file:// URL
      if (searchValue.trim().startsWith('file://')) {
        // Navigate to the URL route which will show the upload interface
        const encodedUrl = encodeURIComponent(searchValue.trim())
        router.push(`/${encodedUrl}`)
        return
      }
      
      const encodedUrl = encodeURIComponent(searchValue.trim())
      router.push(`/${encodedUrl}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleResumeReading = (url: string, page: number) => {
    const encodedUrl = encodeURIComponent(url)
    router.push(`/${encodedUrl}?page=${page}`)
  }

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  // If user has books and we want to show the reading list
  if (showReadingList && hasBooks) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-4">
          <div className="container mx-auto px-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">blen</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setShowReadingList(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Home
              </Button>
            </div>
          </div>
        </div>

        {/* Reading List */}
        <ReadingList onResumeReading={handleResumeReading} />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Book covers background with fade effect */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-2000 ease-out ${
          showImageBackground ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url('/leaf.png')`,
        }}
        role="img"
        aria-label="Background featuring abstract leaf design"
      />

      {/* Top right reading list link */}
      {hasBooks && (
        <div className="absolute top-6 right-6 z-20">
          <div
            onClick={() => setShowReadingList(true)}
            className={`flex items-center gap-2 cursor-pointer transition-colors duration-2000 ease-out ${
              showImageBackground ? 'text-white' : 'text-gray-600'
            }`}
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-lg font-medium">Currently Reading</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo */}
        <h1 className={`text-6xl md:text-8xl font-bold mb-4 tracking-tight transition-colors duration-2000 ease-out ${
          showImageBackground ? 'text-white' : 'text-gray-600'
        }`}>blen</h1>

        {/* Tagline */}
        <p className={`text-xl md:text-2xl font-medium mb-8 transition-colors duration-2000 ease-out ${
          showImageBackground ? 'text-white' : 'text-gray-600'
        }`}>A better way to read PDFs</p>

        {/* Search interface */}
        <div className="w-full max-w-2xl">
          <div
            className={`bg-white rounded-2xl p-6 shadow-2xl transition-all duration-200 ${
              isDragOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div className="absolute inset-6 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl flex items-center justify-center z-10">
                <div className="text-center text-blue-600">
                  <Upload className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Drop your PDF here</p>
                </div>
              </div>
            )}

            {/* Search input */}
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Paste URL to your PDF"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full h-14 text-lg border-0 bg-gray-100 rounded-xl px-4 pr-14 focus-visible:ring-2 focus-visible:ring-blue-500"
                disabled={isUploading}
              />
              <Button
                size="icon"
                className="absolute right-2 top-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                variant="ghost"
                onClick={handleSearch}
                disabled={isUploading}
              >
                <ArrowUp className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Divider with "OR" */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* Upload button */}
            <Button
              onClick={openFileDialog}
              disabled={isUploading}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-3"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading PDF...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Upload PDF from device
                </>
              )}
            </Button>

            {/* Help text */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Drop a PDF file here or click to browse • Max 50MB
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
