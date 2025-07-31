"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { JSX } from "react/jsx-runtime"

interface SearchResult {
  pageNumber: number
  text: string
  startIndex: number
  endIndex: number
  context: string
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  onSearchResult: (pageNumber: number, highlight?: string) => void
  totalPages: number
  getPageText: (pageNumber: number) => string
}

export default function SearchOverlay({ 
  isOpen, 
  onClose, 
  onSearchResult, 
  totalPages, 
  getPageText 
}: SearchOverlayProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Clear search state when overlay is closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
      setCurrentResultIndex(0)
    }
  }, [isOpen])

  // Optimized search function with batching
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults: SearchResult[] = []
    const normalizedQuery = searchQuery.toLowerCase()

    // Process pages in batches to avoid blocking UI
    const batchSize = 10
    for (let batch = 0; batch < Math.ceil(totalPages / batchSize); batch++) {
      const startPage = batch * batchSize + 1
      const endPage = Math.min((batch + 1) * batchSize, totalPages)
      
      // Process batch
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const pageText = getPageText(pageNum)
        if (!pageText) continue

        const normalizedText = pageText.toLowerCase()
        let startIndex = 0

        // Find all occurrences in this page
        while (true) {
          const foundIndex = normalizedText.indexOf(normalizedQuery, startIndex)
          if (foundIndex === -1) break

          // Get context around the match (50 chars before and after)
          const contextStart = Math.max(0, foundIndex - 50)
          const contextEnd = Math.min(pageText.length, foundIndex + normalizedQuery.length + 50)
          const context = pageText.substring(contextStart, contextEnd)

          searchResults.push({
            pageNumber: pageNum,
            text: pageText.substring(foundIndex, foundIndex + normalizedQuery.length),
            startIndex: foundIndex,
            endIndex: foundIndex + normalizedQuery.length,
            context: contextStart > 0 ? '...' + context : context
          })

          startIndex = foundIndex + 1
        }
      }
      
      // Yield control to prevent UI blocking on large documents
      if (batch < Math.ceil(totalPages / batchSize) - 1) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    setResults(searchResults)
    if (searchResults.length > 0) {
      setCurrentResultIndex(0)
      // Only navigate to first result on new search, not when navigating through results
      onSearchResult(searchResults[0].pageNumber, searchQuery)
    } else {
      setCurrentResultIndex(-1)
    }
    setIsSearching(false)
  }, [totalPages, getPageText, onSearchResult])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, performSearch])

  const navigateToResult = useCallback((index: number) => {
    if (results.length === 0 || index < 0 || index >= results.length) return
    
    setCurrentResultIndex(index)
    const result = results[index]
    onSearchResult(result.pageNumber, query)
  }, [results, query, onSearchResult])

  const nextResult = useCallback(() => {
    if (results.length === 0) return
    const nextIndex = (currentResultIndex + 1) % results.length
    navigateToResult(nextIndex)
  }, [results.length, currentResultIndex, navigateToResult])

  const prevResult = useCallback(() => {
    if (results.length === 0) return
    const prevIndex = currentResultIndex - 1 < 0 ? results.length - 1 : currentResultIndex - 1
    navigateToResult(prevIndex)
  }, [results.length, currentResultIndex, navigateToResult])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if typing in input
      if (event.target === inputRef.current) {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          prevResult()
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          nextResult()
        } else if (event.key === 'Enter') {
          event.preventDefault()
          if (results.length > 0) {
            if (event.shiftKey) {
              prevResult()
            } else {
              nextResult()
            }
          }
        }
        return
      }

      // Global shortcuts when not typing
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        case 'ArrowUp':
          event.preventDefault()
          prevResult()
          break
        case 'ArrowDown':
          event.preventDefault()
          nextResult()
          break
        case 'F3':
          event.preventDefault()
          if (event.shiftKey) {
            prevResult()
          } else {
            nextResult()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, nextResult, prevResult])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search in document..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 focus-visible:ring-0 text-lg"
          />
          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevResult}
                  disabled={results.length === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextResult}
                  disabled={results.length === 0}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <div className="text-sm text-gray-600 min-w-fit">
                  {results.length > 0 && currentResultIndex >= 0 ? 
                    `${currentResultIndex + 1} of ${results.length}` : 
                    `${results.length} result${results.length !== 1 ? 's' : ''}`
                  }
                </div>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {isSearching && (
            <div className="p-4 text-center text-gray-600">
              Searching...
            </div>
          )}
          
          {!isSearching && query && results.length === 0 && (
            <div className="p-4 text-center text-gray-600">
              No results found for "{query}"
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="divide-y">
              {results.slice(0, 50).map((result, index) => ( // Limit to 50 results for performance
                <button
                  key={`${result.pageNumber}-${result.startIndex}`}
                  onClick={() => navigateToResult(index)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                    index === currentResultIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      Page {result.pageNumber}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {highlightQuery(result.context, query)}
                  </div>
                </button>
              ))}
              
              {results.length > 50 && (
                <div className="p-3 text-center text-gray-600 text-sm">
                  Showing first 50 of {results.length} results
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="px-4 py-2 bg-gray-100 text-xs text-gray-500 rounded-b-lg">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">↑↓</kbd> or 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded mx-1">Enter</kbd> to navigate, 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}

// Helper function to highlight search query in text
function highlightQuery(text: string, query: string): JSX.Element {
  if (!query.trim()) return <span>{text}</span>

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  
  return (
    <span>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}