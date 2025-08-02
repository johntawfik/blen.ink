"use client"

import { useState, useEffect } from "react"
import { BookOpen, Calendar, Trash2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { readingProgress, ReadingSession } from "@/lib/reading-progress"

interface ReadingListProps {
  onResumeReading: (url: string, page: number) => void
}

// Utility function to format titles by decoding URL encoding and improving readability
const formatTitle = (title: string): string => {
  try {
    // Decode URL encoding (e.g., %20 -> space)
    let decoded = decodeURIComponent(title)
    
    // Replace common separators with spaces and clean up
    decoded = decoded
      .replace(/[_-]+/g, ' ')  // Replace underscores and hyphens with spaces
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim()                  // Remove leading/trailing whitespace
    
    // Capitalize first letter of each word for better readability
    return decoded.replace(/\b\w/g, char => char.toUpperCase())
  } catch (error) {
    // If decoding fails, just clean up the original title
    return title
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase())
  }
}

export default function ReadingList({ onResumeReading }: ReadingListProps) {
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    const loadSessions = () => {
      const allSessions = readingProgress.getAllSessions()
      setSessions(allSessions)
    }

    loadSessions()
    
    // Refresh every few seconds in case data changes
    const interval = setInterval(loadSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleRemoveBook = (url: string) => {
    readingProgress.removeSession(url)
    setSessions(prev => prev.filter(s => s.url !== url))
  }

  const formatLastRead = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getProgressPercentage = (session: ReadingSession) => {
    return Math.round((session.pagesRead.size / session.totalPages) * 100)
  }

  if (sessions.length === 0) {
    return (
      <div className="container mx-auto p-6 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Reading List</h1>
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">No books yet</h3>
            <p className="text-gray-600">
              Start reading a PDF to see it appear in your reading list
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Reading List</h1>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session) => {
            const isHovered = hoveredId === session.url
            const progressPercentage = getProgressPercentage(session)
            
            return (
              <div
                key={session.url}
                className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
                onMouseEnter={() => setHoveredId(session.url)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Book Card - matching PDF showcase styling */}
                <div className="relative">
                  <div className="w-48 h-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden relative group-hover:shadow-xl transition-shadow duration-300">
                    {/* Cover image section */}
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center relative">
                      {session.firstPagePreview ? (
                        <img
                          src={session.firstPagePreview}
                          alt={`${session.title} - First page`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.parentElement!.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium p-3 text-center">
                                ${formatTitle(session.title)}
                              </div>
                            `
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium p-3 text-center">
                          {formatTitle(session.title)}
                        </div>
                      )}
                      
                      {/* Progress overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>{progressPercentage}% complete</span>
                          <span>Page {session.pagesRead.size}/{session.totalPages}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-white/30 rounded-full h-1 mt-1">
                          <div 
                            className="bg-white rounded-full h-1 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Book info section */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {formatTitle(session.title)}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3 text-gray-500" />
                                                 <span className="text-xs text-gray-500">
                           {formatLastRead(session.lastReadAt)}
                         </span>
                      </div>
                    </div>

                    {/* Category badge - matching PDF showcase */}
                    <div className="absolute top-2 right-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        Reading
                      </span>
                    </div>
                  </div>

                  {/* Action buttons - appear on hover */}
                  <div className={`absolute -bottom-6 left-0 right-0 flex gap-2 transition-all duration-300 ${
                    isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  }`}>
                    <Button 
                      onClick={() => onResumeReading(session.url, session.pagesRead.size)}
                      className="flex-1 h-8 text-xs"
                      size="sm"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Continue
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveBook(session.url)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}