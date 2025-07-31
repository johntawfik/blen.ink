"use client"

import { useState, useEffect } from "react"
import { BookOpen, Calendar, Trash2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Reading List</h1>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.url} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="aspect-[3/4] relative mb-3 overflow-hidden rounded-md bg-gray-100">
                  {session.firstPagePreview ? (
                    <img
                      src={session.firstPagePreview}
                      alt={`${session.title} - First page`}
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.warn('Failed to load preview image, removing from storage')
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                      <BookOpen className="h-12 w-12 text-blue-500" />
                    </div>
                  )}
                  

                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Page {session.pagesRead.size} of {session.totalPages}</span>
                    </div>
                  </div>
                </div>
                
                <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {formatTitle(session.title)}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{session.pagesRead.size} pages read</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => onResumeReading(session.url, session.pagesRead.size)}
                    className="flex-1"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Continue Reading
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveBook(session.url)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}