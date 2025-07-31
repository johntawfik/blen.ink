"use client"

import { useState, useEffect } from "react"
import { Clock, BookOpen, Bookmark } from "lucide-react"
import { readingProgress, ReadingSession } from "@/lib/reading-progress"

interface ReadingProgressBarProps {
  url: string
  currentPage: number
  totalPages: number
}

export default function ReadingProgressBar({ 
  url, 
  currentPage, 
  totalPages 
}: ReadingProgressBarProps) {
  const [stats, setStats] = useState<any>(null)
  const [session, setSession] = useState<ReadingSession | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark as client-side after hydration
    setIsClient(true)
    
    const updateStats = () => {
      const currentStats = readingProgress.getStats(url)
      const currentSession = readingProgress.getCurrentSession()
      
      setStats(currentStats)
      setSession(currentSession)
    }

    updateStats()
    
    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000)
    return () => clearInterval(interval)
  }, [url, currentPage])

  // Don't render until client-side hydration is complete
  if (!isClient || !stats) return null

  const progressPercentage = (currentPage / totalPages) * 100

  return (
    <div className="bg-white bg-opacity-95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg">
      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-4 w-4 text-gray-600" />
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reading Stats */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-4">
          {/* bookmarks */}
          {session && session.bookmarks.length > 0 && (
            <div className="flex items-center gap-1">
              <Bookmark className="h-3 w-3" />
              <span>{session.bookmarks.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}