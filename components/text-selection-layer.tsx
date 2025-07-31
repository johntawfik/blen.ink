"use client"

import { useState, useEffect, useRef } from "react"

interface TextSelectionLayerProps {
  pageNumber: number
  pageText: string
  onTextSelected?: (text: string) => void
}

export default function TextSelectionLayer({
  pageNumber,
  pageText,
  onTextSelected
}: TextSelectionLayerProps) {
  const [selectedText, setSelectedText] = useState("")
  const textRef = useRef<HTMLDivElement>(null)

  // Handle text selection
  const handleSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      setSelectedText("")
      return
    }

    const selectedString = selection.toString().trim()
    if (selectedString.length > 0) {
      // Check if selection is within our text layer
      const range = selection.getRangeAt(0)
      const container = textRef.current
      if (container && container.contains(range.commonAncestorContainer)) {
        setSelectedText(selectedString)
        onTextSelected?.(selectedString)
        
        // Auto-copy to clipboard
        navigator.clipboard.writeText(selectedString).catch(console.error)
      }
    } else {
      setSelectedText("")
    }
  }

  // Clear selection when clicking elsewhere
  const handleMouseDown = (event: React.MouseEvent) => {
    // Allow text selection to work naturally
    event.stopPropagation()
  }

  // Listen for selection changes with better handling
  useEffect(() => {
    const handleSelectionChange = () => {
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        handleSelection()
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [onTextSelected])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        if (textRef.current && document.activeElement === textRef.current) {
          event.preventDefault()
          
          // Select all text in this page
          const range = document.createRange()
          range.selectNodeContents(textRef.current)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
          
          onTextSelected?.(pageText)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pageText, onTextSelected])

  if (!pageText) return null

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      onMouseDown={handleMouseDown}
    >
      {/* Invisible selectable text layer */}
      <div
        ref={textRef}
        className="absolute inset-0 text-transparent select-text cursor-text leading-relaxed p-4"
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text'
        }}
        tabIndex={0}
      >
        {pageText}
      </div>

    </div>
  )
}