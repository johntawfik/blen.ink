// Reading Progress Tracking

export interface ReadingSession {
  url: string
  title: string
  totalPages: number
  currentPage: number
  lastReadAt: Date
  totalTimeSpent: number // in seconds
  pagesRead: Set<number>
  bookmarks: Bookmark[]
  firstPagePreview?: string // base64 image data
}

export interface Bookmark {
  id: string
  pageNumber: number
  title: string
  note?: string
  createdAt: Date
}

class ReadingProgressManager {
  private readonly STORAGE_KEY = 'leaf-reading-progress'
  private sessions: Map<string, ReadingSession> = new Map()
  private currentSession: ReadingSession | null = null
  private sessionStartTime: Date | null = null

  constructor() {
    this.loadFromStorage()
  }

  // Load reading progress from localStorage
  private loadFromStorage() {
    try {
      // Only access localStorage in the browser
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          Object.entries(data).forEach(([url, sessionData]: [string, any]) => {
            this.sessions.set(url, {
              ...sessionData,
              lastReadAt: new Date(sessionData.lastReadAt),
              pagesRead: new Set(sessionData.pagesRead),
              bookmarks: sessionData.bookmarks.map((b: any) => ({
                ...b,
                createdAt: new Date(b.createdAt)
              }))
            })
          })
        }
      }
    } catch (error) {
      console.error('Failed to load reading progress:', error)
    }
  }

  // Save reading progress to localStorage
  private saveToStorage() {
    try {
      // Only access localStorage in the browser
      if (typeof window !== 'undefined') {
        const data: Record<string, any> = {}
        this.sessions.forEach((session, url) => {
          data[url] = {
            ...session,
            pagesRead: Array.from(session.pagesRead),
            lastReadAt: session.lastReadAt.toISOString(),
            bookmarks: session.bookmarks.map(b => ({
              ...b,
              createdAt: b.createdAt.toISOString()
            }))
          }
        })
        
        const jsonString = JSON.stringify(data)
        
        // Check if the data size is reasonable (under 4MB to leave room for other storage)
        if (jsonString.length > 4 * 1024 * 1024) {
          this.cleanupOldPreviews()
          // Try again with cleaned data
          const cleanedData: Record<string, any> = {}
          this.sessions.forEach((session, url) => {
            cleanedData[url] = {
              ...session,
              pagesRead: Array.from(session.pagesRead),
              lastReadAt: session.lastReadAt.toISOString(),
              bookmarks: session.bookmarks.map(b => ({
                ...b,
                createdAt: b.createdAt.toISOString()
              }))
            }
          })
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedData))
        } else {
          localStorage.setItem(this.STORAGE_KEY, jsonString)
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded()
      } else {
        console.error('Failed to save reading progress:', error)
      }
    }
  }

  // Start a reading session
  startSession(url: string, title: string, totalPages: number): ReadingSession {
    this.sessionStartTime = new Date()
    
    let session = this.sessions.get(url)
    if (!session) {
      session = {
        url,
        title,
        totalPages,
        currentPage: 1,
        lastReadAt: new Date(),
        totalTimeSpent: 0,
        pagesRead: new Set(),
        bookmarks: []
      }
      this.sessions.set(url, session)
    } else {
      session.title = title // Update title in case it changed
      session.totalPages = totalPages
      session.lastReadAt = new Date()
    }
    
    this.currentSession = session
    return session
  }

  // Update current page
  updateCurrentPage(pageNumber: number) {
    if (!this.currentSession) return

    this.currentSession.currentPage = pageNumber
    this.currentSession.pagesRead.add(pageNumber)
    this.currentSession.lastReadAt = new Date()
    
    this.saveToStorage()
  }

  // Update first page preview with compression
  updateFirstPagePreview(imageDataUrl: string) {
    if (!this.currentSession) return

    // Compress the image before storing
    this.compressImage(imageDataUrl, 300, 400, 0.7).then(compressedImage => {
      if (this.currentSession) {
        this.currentSession.firstPagePreview = compressedImage
        this.saveToStorage()
      }
    }).catch(error => {
      // Failed to compress preview image - skipping
    })
  }

  // Compress image to reduce storage size
  private compressImage(dataUrl: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = dataUrl
    })
  }

  // Clean up old previews to save space
  private cleanupOldPreviews() {
    const sessions = Array.from(this.sessions.values())
    const sortedSessions = sessions.sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
    
    // Keep previews for the 10 most recently read books, remove others
    const keepCount = 10
    for (let i = keepCount; i < sortedSessions.length; i++) {
      const session = sortedSessions[i]
      if (session.firstPagePreview) {
        session.firstPagePreview = undefined
      }
    }
  }

  // Handle quota exceeded by aggressive cleanup
  private handleQuotaExceeded() {
    // Only handle quota exceeded in the browser
    if (typeof window === 'undefined') return
    
    try {
      // First, try removing all previews
      this.sessions.forEach(session => {
        session.firstPagePreview = undefined
      })
      
      // Try to save again
      const data: Record<string, any> = {}
      this.sessions.forEach((session, url) => {
        data[url] = {
          ...session,
          pagesRead: Array.from(session.pagesRead),
          lastReadAt: session.lastReadAt.toISOString(),
          bookmarks: session.bookmarks.map(b => ({
            ...b,
            createdAt: b.createdAt.toISOString()
          }))
        }
      })
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Still cannot save even after cleanup, localStorage may be full:', error)
      // As a last resort, keep only the most recent 5 sessions
      const sessions = Array.from(this.sessions.entries())
      const sortedSessions = sessions.sort(([,a], [,b]) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
      
      this.sessions.clear()
      sortedSessions.slice(0, 5).forEach(([url, session]) => {
        this.sessions.set(url, { ...session, firstPagePreview: undefined })
      })
      
      try {
        const data: Record<string, any> = {}
        this.sessions.forEach((session, url) => {
          data[url] = {
            ...session,
            pagesRead: Array.from(session.pagesRead),
            lastReadAt: session.lastReadAt.toISOString(),
            bookmarks: session.bookmarks.map(b => ({
              ...b,
              createdAt: b.createdAt.toISOString()
            }))
          }
        })
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
      } catch (finalError) {
        console.error('Cannot save reading progress at all:', finalError)
      }
    }
  }

  // End reading session
  endSession() {
    if (!this.currentSession || !this.sessionStartTime) return

    const sessionDuration = Math.floor(
      (new Date().getTime() - this.sessionStartTime.getTime()) / 1000
    )
    
    this.currentSession.totalTimeSpent += sessionDuration
    this.currentSession.lastReadAt = new Date()
    
    this.saveToStorage()
    
    this.currentSession = null
    this.sessionStartTime = null
  }

  // Add bookmark
  addBookmark(pageNumber: number, title: string, note?: string): string {
    if (!this.currentSession) throw new Error('No active session')

    const bookmark: Bookmark = {
      id: Date.now().toString(),
      pageNumber,
      title,
      note,
      createdAt: new Date()
    }

    this.currentSession.bookmarks.push(bookmark)
    this.saveToStorage()
    
    return bookmark.id
  }

  // Remove bookmark
  removeBookmark(bookmarkId: string) {
    if (!this.currentSession) return

    this.currentSession.bookmarks = this.currentSession.bookmarks.filter(
      b => b.id !== bookmarkId
    )
    this.saveToStorage()
  }

  // Get reading statistics
  getStats(url: string) {
    const session = this.sessions.get(url)
    if (!session) return null

    const progress = session.pagesRead.size / session.totalPages
    const minutesRead = Math.floor(session.totalTimeSpent / 60)
    const estimatedTimeRemaining = minutesRead > 0 
      ? Math.floor((minutesRead / progress) - minutesRead)
      : null

    return {
      progress: Math.round(progress * 100),
      pagesRead: session.pagesRead.size,
      totalPages: session.totalPages,
      timeSpent: {
        total: session.totalTimeSpent,
        formatted: this.formatTime(session.totalTimeSpent)
      },
      estimatedTimeRemaining: estimatedTimeRemaining 
        ? this.formatTime(estimatedTimeRemaining * 60)
        : null,
      lastReadAt: session.lastReadAt,
      bookmarksCount: session.bookmarks.length
    }
  }

  // Get current session
  getCurrentSession(): ReadingSession | null {
    return this.currentSession
  }

  // Get all sessions
  getAllSessions(): ReadingSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime()
    )
  }

  // Format time duration
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return `${seconds}s`
    }
  }

  // Remove a specific session
  removeSession(url: string) {
    this.sessions.delete(url)
    if (this.currentSession?.url === url) {
      this.currentSession = null
      this.sessionStartTime = null
    }
    this.saveToStorage()
  }

  // Get storage size information
  getStorageInfo() {
    try {
      // Only access localStorage in the browser
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY) || '{}'
        const sizeInBytes = new Blob([stored]).size
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2)
        
        return {
          sizeInBytes,
          sizeInMB: parseFloat(sizeInMB),
          sessionCount: this.sessions.size,
          previewCount: Array.from(this.sessions.values()).filter(s => s.firstPagePreview).length
        }
      } else {
        return {
          sizeInBytes: 0,
          sizeInMB: 0,
          sessionCount: this.sessions.size,
          previewCount: Array.from(this.sessions.values()).filter(s => s.firstPagePreview).length
        }
      }
    } catch (error) {
      return { sizeInBytes: 0, sizeInMB: 0, sessionCount: 0, previewCount: 0 }
    }
  }

  // Manually clean all previews
  clearAllPreviews() {
    this.sessions.forEach(session => {
      session.firstPagePreview = undefined
    })
    this.saveToStorage()
  }

  // Clear all progress (for development/testing)
  clearAll() {
    this.sessions.clear()
    this.currentSession = null
    this.sessionStartTime = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }
}

// Export singleton instance
export const readingProgress = new ReadingProgressManager()