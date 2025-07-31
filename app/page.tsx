"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUp, BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import ReadingList from "@/components/reading-list"
import { readingProgress } from "@/lib/reading-progress"

export default function DupeApp() {
  const [searchValue, setSearchValue] = useState("")
  const [showReadingList, setShowReadingList] = useState(false)
  const [hasBooks, setHasBooks] = useState(false)
  const [showImageBackground, setShowImageBackground] = useState(true)
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
      {/* Book covers background with fade effect */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-2000 ease-out ${
          showImageBackground ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url('/leaf.png')`,
        }}
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
            <BookOpen className="h-5 w-5" />
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
        }`}>A better way to read PDFs online</p>

        {/* Search interface */}
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            {/* Search input */}
            <div className="relative mb-6">
              <Input
                type="text"
                placeholder="Paste URL to your PDF"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full h-14 text-lg border-0 bg-gray-100 rounded-xl px-4 pr-14 focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <Button
                size="icon"
                className="absolute right-2 top-2 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                variant="ghost"
                onClick={handleSearch}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
