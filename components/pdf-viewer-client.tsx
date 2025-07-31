"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, AlertCircle, ZoomIn, ZoomOut, Search, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loadPDFFromUrl, PDFTextContent, PDFPage } from "@/lib/pdf-utils"
import SearchOverlay from "@/components/search-overlay"
import ReadingProgressBar from "@/components/reading-progress-bar"
import BookmarksPanel from "@/components/bookmarks-panel"
import { readingProgress } from "@/lib/reading-progress"

interface PDFViewerClientProps {
  pdfUrl: string
  startPage?: number
}

interface LoadedPage extends PDFPage {
  isLoaded: boolean
  isLoading: boolean
}

export default function PDFViewerClient({ pdfUrl, startPage = 1 }: PDFViewerClientProps) {
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [loadedPages, setLoadedPages] = useState<Map<number, LoadedPage>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(startPage)
  const [zoom, setZoom] = useState(1.6)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [allPageTexts, setAllPageTexts] = useState<Map<number, string>>(new Map())
  const [lastSearchPage, setLastSearchPage] = useState<number | null>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Load PDF document and extract all text content for fast search
  useEffect(() => {
    const loadPDFDocument = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Import PDF.js with static import method for better compatibility
        const pdfjs = await import('pdfjs-dist')
        
        // Configure worker - use local worker file for better reliability
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

        // Try direct access first, fallback to proxy if CORS issues
        let pdfUrl_processed = pdfUrl
        try {
          const testResponse = await fetch(pdfUrl, { method: 'HEAD' })
          if (!testResponse.ok) {
            throw new Error('Direct access failed')
          }
        } catch {
          pdfUrl_processed = `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`
        }

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl_processed,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        })
        
        const pdf = await loadingTask.promise
        
        setPdfDocument(pdf)
        setTotalPages(pdf.numPages)
        pageRefs.current = new Array(pdf.numPages).fill(null)
        
        // Extract title from PDF metadata or fallback to filename
        let title = 'Untitled PDF'
        try {
          const metadata = await pdf.getMetadata()
          if (metadata.info && typeof metadata.info === 'object' && 'Title' in metadata.info && typeof metadata.info['Title'] === 'string' && metadata.info['Title'].trim()) {
            title = metadata.info['Title'].trim()
          } else {
            const urlPath = new URL(pdfUrl).pathname
            const filename = urlPath.split('/').pop() || 'document.pdf'
            title = filename.replace(/\.pdf$/i, '')
          }
        } catch (err) {
          try {
            const urlPath = new URL(pdfUrl).pathname
            const filename = urlPath.split('/').pop() || 'document.pdf'
            title = filename.replace(/\.pdf$/i, '')
          } catch {
            title = 'Untitled PDF'
          }
        }
        
        // Start reading session
        readingProgress.startSession(pdfUrl, title, pdf.numPages)
        
        // Initialize loaded pages map
        const initialPages = new Map<number, LoadedPage>()
        for (let i = 1; i <= pdf.numPages; i++) {
          initialPages.set(i, {
            pageNumber: i,
            text: '',
            formattedText: '',
            isLoaded: false,
            isLoading: false
          })
        }
        setLoadedPages(initialPages)
        
        // Pre-load all text content for fast search (but not visual rendering)
        const textMap = new Map<number, string>()
        
        // Extract text from all pages concurrently for faster loading
        const textExtractionPromises = []
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const textPromise = pdf.getPage(pageNum).then(async (page) => {
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
            textMap.set(pageNum, pageText)
          }).catch(err => {
            textMap.set(pageNum, '')
          })
          textExtractionPromises.push(textPromise)
        }
        
        // Wait for all text extraction to complete
        await Promise.all(textExtractionPromises)
        setAllPageTexts(textMap)
        
      } catch (err) {
        console.error('Error loading PDF document:', err)
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }

    if (pdfUrl) {
      loadPDFDocument()
    }
  }, [pdfUrl])

  // Lazy load individual pages (visual rendering only, text already pre-loaded)
  const loadPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocument) return
    
    setLoadedPages(prev => {
      const updated = new Map(prev)
      const page = updated.get(pageNumber)
      if (page && (page.isLoaded || page.isLoading)) return prev
      
      if (page) {
        updated.set(pageNumber, { ...page, isLoading: true })
      }
      return updated
    })

    try {
      const page = await pdfDocument.getPage(pageNumber)
      
      // Render page with base scale (we'll zoom with CSS)
      const baseScale = 1.5
      const viewport = page.getViewport({ scale: baseScale })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) throw new Error('Failed to get canvas context')
      
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise
      
      const imageDataUrl = canvas.toDataURL('image/png', 0.8)
      
      // Store first page preview for reading list
      if (pageNumber === 1) {
        readingProgress.updateFirstPagePreview(imageDataUrl)
      }
      
      // Get pre-loaded text (much faster than re-extracting)
      const pageText = allPageTexts.get(pageNumber) || ''
      
      setLoadedPages(prev => {
        const updated = new Map(prev)
        updated.set(pageNumber, {
          pageNumber,
          text: pageText,
          formattedText: pageText,
          imageDataUrl,
          viewport,
          isLoaded: true,
          isLoading: false
        })
        return updated
      })
      
    } catch (err) {
      console.error(`Error loading page ${pageNumber}:`, err)
      setLoadedPages(prev => {
        const updated = new Map(prev)
        const page = updated.get(pageNumber)
        if (page) {
          updated.set(pageNumber, { ...page, isLoading: false })
        }
        return updated
      })
    }
  }, [pdfDocument, allPageTexts])

  // Scroll to page function
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageRef = pageRefs.current[pageNumber - 1]
    if (pageRef) {
      pageRef.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }, [])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!pdfDocument || totalPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNumber = parseInt(entry.target.getAttribute('data-page') || '1')
            setCurrentPage(pageNumber)
            
            // Update reading progress
            readingProgress.updateCurrentPage(pageNumber)
            
            // Load current page and more adjacent pages for better experience
            const pagesToLoad = [
              pageNumber - 3,
              pageNumber - 2,
              pageNumber - 1,
              pageNumber,
              pageNumber + 1,
              pageNumber + 2,
              pageNumber + 3
            ].filter((p: number) => p >= 1 && p <= totalPages)
            
            pagesToLoad.forEach(loadPage)
          }
        })
      },
      {
        threshold: 0.3,
        rootMargin: '200px 0px 200px 0px' // Preload pages before they're visible
      }
    )

    observerRef.current = observer

    // Set up observer after a small delay to ensure page elements are rendered
    const setupObserver = () => {
      pageRefs.current.forEach((ref) => {
        if (ref) observer.observe(ref)
      })
    }

    // Try to set up observer immediately
    setupObserver()
    
    // Also set up observer after a delay to catch any late-rendered elements
    const observerTimeout = setTimeout(setupObserver, 100)

    // Load a wider range around start page immediately for better navigation experience
    const initialPages = [
      // Priority loading around start page
      startPage - 5, startPage - 4, startPage - 3, startPage - 2, startPage - 1,
      startPage,
      startPage + 1, startPage + 2, startPage + 3, startPage + 4, startPage + 5,
      // Always load first few pages for good initial experience
      1, 2, 3, 4, 5
    ]
      .filter((p: number) => p >= 1 && p <= totalPages)
      .filter((p, index, arr) => arr.indexOf(p) === index) // Remove duplicates
    initialPages.forEach(loadPage)

    // Scroll to start page after a brief delay to ensure elements are rendered
    const scrollTimeout = setTimeout(() => {
      if (startPage > 1) {
        scrollToPage(startPage)
      }
    }, 1000)

    // Background preloader - gradually load remaining pages
    const backgroundLoader = setTimeout(() => {
      // Load all remaining pages gradually, starting from those closest to start page
      const allPages = Array.from({ length: totalPages }, (_, i) => i + 1)
      const loadedPageNumbers = new Set(initialPages)
      const remainingPages = allPages
        .filter(p => !loadedPageNumbers.has(p))
        .sort((a, b) => Math.abs(a - startPage) - Math.abs(b - startPage)) // Sort by distance from start page
      
      // Load remaining pages with a delay to avoid overwhelming the browser
      remainingPages.forEach((pageNum, index) => {
        setTimeout(() => loadPage(pageNum), index * 100) // 100ms delay between each page
      })
    }, 2000) // Start background loading after 2 seconds

    return () => {
      observer.disconnect()
      observerRef.current = null
      clearTimeout(scrollTimeout)
      clearTimeout(backgroundLoader)
      clearTimeout(observerTimeout)
    }
  }, [pdfDocument, totalPages, loadPage, startPage, scrollToPage])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!totalPages) return
      
      // Don't handle navigation if search is open
      if (searchOpen) return
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          // Clear last search page when manually navigating
          setLastSearchPage(null)
          scrollToPage(Math.max(1, currentPage - 1))
          break
        case 'ArrowDown':
          event.preventDefault()
          // Clear last search page when manually navigating
          setLastSearchPage(null)
          scrollToPage(Math.min(totalPages, currentPage + 1))
          break
        case 'Home':
          event.preventDefault()
          setLastSearchPage(null)
          scrollToPage(1)
          break
        case 'End':
          event.preventDefault()
          setLastSearchPage(null)
          scrollToPage(totalPages)
          break
        case '=':
        case '+':
          event.preventDefault()
          setZoom(prev => Math.min(3, prev + 0.2))
          break
        case '-':
          event.preventDefault()
          setZoom(prev => Math.max(0.5, prev - 0.2))
          break
        case '0':
          event.preventDefault()
          setZoom(1.0)
          break
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            setSearchOpen(true)
          }
          break
        case 'b':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            setBookmarksOpen(true)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, searchOpen])

  // Cleanup reading session on unmount
  useEffect(() => {
    return () => {
      readingProgress.endSession()
    }
  }, [])

  const getPageText = useCallback((pageNumber: number): string => {
    return allPageTexts.get(pageNumber) || ""
  }, [allPageTexts])

  const handleSearchResult = useCallback((pageNumber: number, highlight?: string) => {
    setLastSearchPage(pageNumber)
    scrollToPage(pageNumber)
  }, [scrollToPage])


  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-600">
          <Loader2 className="h-12 w-12 animate-spin" />
          <span className="text-lg">Loading PDF...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md text-gray-600">
          <AlertCircle className="h-16 w-16 mx-auto mb-6" />
          <h3 className="text-xl font-semibold mb-3">Error Loading PDF</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="bg-white text-gray-900 hover:bg-gray-50 border-gray-200"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!pdfDocument || totalPages === 0) return null

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-auto">
      {/* Controls */}
      <div className="fixed top-4 left-4 z-20 flex flex-col gap-2">
        {/* Search Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="bg-white bg-opacity-90 text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
          title="Search (Ctrl+F)"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Bookmarks Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setBookmarksOpen(true)}
          className="bg-white bg-opacity-90 text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
          title="Bookmarks (Ctrl+B)"
        >
          <Bookmark className="h-4 w-4" />
        </Button>
        
        {/* Zoom Controls */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
          className="bg-white bg-opacity-90 text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
          className="bg-white bg-opacity-90 text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="bg-white bg-opacity-90 text-gray-600 text-xs px-2 py-1 rounded border border-gray-200 text-center shadow-sm">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Reading Progress */}
      <div className="fixed top-4 right-4 z-20">
        <ReadingProgressBar
          url={pdfUrl}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </div>

      {/* Keyboard shortcuts help */}
      <div className="fixed bottom-4 left-4 z-20 bg-white bg-opacity-90 text-gray-500 text-xs px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
        ↑↓ Navigate • +/- Zoom • 0 Reset • Ctrl+F Search • Ctrl+B Bookmarks
      </div>

      {/* PDF Pages */}
      <div className="min-h-full py-8">
        <div className="flex flex-col items-center ">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1
            const pageData = loadedPages.get(pageNumber)
            
            return (
              <div
                key={pageNumber}
                ref={(el) => { 
                  pageRefs.current[index] = el
                  // Observe this element if observer is ready and element exists
                  if (el && observerRef.current) {
                    observerRef.current.observe(el)
                  }
                }}
                data-page={pageNumber}
                className="flex justify-center"
                style={{
                  minHeight: `${1000 * zoom}px`,
                  width: '100%',
                  paddingBottom: `${50 * zoom}px`,
                }}
              >
                                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center top',
                  }}
                >
                  {pageData?.isLoaded && pageData.imageDataUrl ? (
                    <div className="relative">
                      <img
                        src={pageData.imageDataUrl}
                        alt={`Page ${pageNumber}`}
                        className="block shadow-md bg-white border border-gray-200"
                        style={{ 
                          width: '800px',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </div>
                  ) : pageData?.isLoading ? (
                    <div className="flex items-center justify-center bg-white shadow-md border border-gray-200" 
                         style={{ 
                           width: '800px',
                           height: '1131px'
                         }}>
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span>Loading page {pageNumber}...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-white shadow-md border border-gray-200"
                         style={{ 
                           width: '800px',
                           height: '1131px'
                         }}>
                      <div className="text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-2"></div>
                        <p>Page {pageNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
             )
           })}
         </div>
       </div>

       {/* Search Overlay */}
       <SearchOverlay
         isOpen={searchOpen}
         onClose={() => setSearchOpen(false)}
         onSearchResult={handleSearchResult}
         totalPages={totalPages}
         getPageText={getPageText}
       />

       {/* Bookmarks Panel */}
       <BookmarksPanel
         isOpen={bookmarksOpen}
         onClose={() => setBookmarksOpen(false)}
         currentPage={currentPage}
         onNavigateToPage={scrollToPage}
       />
     </div>
   )
 }