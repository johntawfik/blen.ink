"use client"

import { useState, useEffect } from "react"
import { Bookmark, Plus, X, Edit3, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { readingProgress, Bookmark as BookmarkType } from "@/lib/reading-progress"

interface BookmarksPanelProps {
  isOpen: boolean
  onClose: () => void
  currentPage: number
  onNavigateToPage: (pageNumber: number) => void
}

export default function BookmarksPanel({ 
  isOpen, 
  onClose, 
  currentPage, 
  onNavigateToPage 
}: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null)
  const [newBookmarkTitle, setNewBookmarkTitle] = useState("")
  const [newBookmarkNote, setNewBookmarkNote] = useState("")

  // Load bookmarks when panel opens
  useEffect(() => {
    if (isOpen) {
      const session = readingProgress.getCurrentSession()
      if (session) {
        setBookmarks([...session.bookmarks].sort((a, b) => a.pageNumber - b.pageNumber))
      }
    }
  }, [isOpen])

  const handleAddBookmark = () => {
    if (!newBookmarkTitle.trim()) return

    try {
      readingProgress.addBookmark(
        currentPage, 
        newBookmarkTitle.trim(), 
        newBookmarkNote.trim() || undefined
      )
      
      // Refresh bookmarks list
      const session = readingProgress.getCurrentSession()
      if (session) {
        setBookmarks([...session.bookmarks].sort((a, b) => a.pageNumber - b.pageNumber))
      }
      
      setShowAddForm(false)
      setNewBookmarkTitle("")
      setNewBookmarkNote("")
    } catch (error) {
      console.error('Failed to add bookmark:', error)
    }
  }

  const handleDeleteBookmark = (bookmarkId: string) => {
    readingProgress.removeBookmark(bookmarkId)
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
  }

  const handleEditBookmark = (bookmark: BookmarkType) => {
    setEditingBookmark(bookmark.id)
    setNewBookmarkTitle(bookmark.title)
    setNewBookmarkNote(bookmark.note || "")
  }

  const handleSaveEdit = (bookmarkId: string) => {
    // Remove old bookmark and add new one
    handleDeleteBookmark(bookmarkId)
    handleAddBookmark()
    setEditingBookmark(null)
  }

  const handleCancelEdit = () => {
    setEditingBookmark(null)
    setNewBookmarkTitle("")
    setNewBookmarkNote("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div className="bg-white h-full w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-100">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Bookmarks</h2>
            <span className="text-sm text-gray-600">({bookmarks.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Add Bookmark Button */}
          {!showAddForm && !editingBookmark && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-4 bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bookmark (Page {currentPage})
            </Button>
          )}

          {/* Add/Edit Bookmark Form */}
          {(showAddForm || editingBookmark) && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg border">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Title
                </label>
                <Input
                  value={newBookmarkTitle}
                  onChange={(e) => setNewBookmarkTitle(e.target.value)}
                  placeholder="Bookmark title..."
                  className="w-full"
                />
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Note (optional)
                </label>
                <Textarea
                  value={newBookmarkNote}
                  onChange={(e) => setNewBookmarkNote(e.target.value)}
                  placeholder="Add a note about this bookmark..."
                  className="w-full h-16 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => editingBookmark ? handleSaveEdit(editingBookmark) : handleAddBookmark()}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                  disabled={!newBookmarkTitle.trim()}
                >
                  {editingBookmark ? 'Save' : 'Add'}
                </Button>
                <Button
                  onClick={() => {
                    if (editingBookmark) {
                      handleCancelEdit()
                    } else {
                      setShowAddForm(false)
                      setNewBookmarkTitle("")
                      setNewBookmarkNote("")
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Bookmarks List */}
          {bookmarks.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Bookmark className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No bookmarks yet</p>
              <p className="text-sm">Add bookmarks to quickly jump to important pages</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    bookmark.pageNumber === currentPage
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => onNavigateToPage(bookmark.pageNumber)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Page {bookmark.pageNumber}
                        </span>
                        <span className="text-xs text-gray-600">
                          {bookmark.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {bookmark.title}
                      </h3>
                      {bookmark.note && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {bookmark.note}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditBookmark(bookmark)
                        }}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-gray-600"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteBookmark(bookmark.id)
                        }}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-100">
          <div className="text-xs text-gray-500 text-center">
            Click on any bookmark to jump to that page
          </div>
        </div>
      </div>
    </div>
  )
}