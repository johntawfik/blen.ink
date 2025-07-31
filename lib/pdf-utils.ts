// Dynamic import to avoid SSR issues
async function getPDFJS() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used on the client side');
  }
  
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configure worker only once
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }
  
  return pdfjsLib;
}

export interface PDFPage {
  pageNumber: number
  text: string
  formattedText: string
  canvas?: HTMLCanvasElement
  imageDataUrl?: string
  viewport?: any
}

export interface PDFTextContent {
  text: string
  pages: PDFPage[]
  totalPages: number
}

// Improved text extraction that preserves formatting
function extractFormattedText(textContent: any): string {
  const lines: { y: number; text: string; items: any[] }[] = []
  
  // Group text items by their Y position (line)
  textContent.items.forEach((item: any) => {
    const y = Math.round(item.transform[5]) // Y position
    let line = lines.find(l => Math.abs(l.y - y) < 5) // Group items within 5 units of Y
    
    if (!line) {
      line = { y, text: '', items: [] }
      lines.push(line)
    }
    
    line.items.push(item)
  })
  
  // Sort lines by Y position (top to bottom)
  lines.sort((a, b) => b.y - a.y)
  
  // Process each line with better spacing detection
  const processedLines = lines.map(line => {
    // Sort items in the line by X position (left to right)
    line.items.sort((a, b) => a.transform[4] - b.transform[4])
    
    // Build line text with smart spacing
    let lineText = ''
    let lastItem: any = null
    
    line.items.forEach((item, index) => {
      const text = item.str.trim()
      if (!text) return
      
      if (lastItem) {
        const currentX = item.transform[4]
        const lastX = lastItem.transform[4]
        const lastWidth = lastItem.width || 0
        const gap = currentX - (lastX + lastWidth)
        
        // Detect if we need spacing
        const needsSpace = shouldAddSpace(lastItem, item, gap)
        
        if (needsSpace) {
          lineText += ' '
        }
      }
      
      // Handle potential formatting indicators
      const formattedText = processTextFormatting(text, item)
      lineText += formattedText
      lastItem = item
    })
    
    return lineText.trim()
  }).filter(line => line.length > 0)
  
  // Combine lines into paragraphs with better logic
  const paragraphs: string[] = []
  let currentParagraph = ''
  
  processedLines.forEach((line, index) => {
    const nextLine = processedLines[index + 1]
    const prevLine = processedLines[index - 1]
    
    // Add line to current paragraph
    if (currentParagraph) {
      currentParagraph += ' ' + line
    } else {
      currentParagraph = line
    }
    
    // Better paragraph detection
    const isEndOfParagraph = 
      !nextLine || // Last line
      line.endsWith('.') || line.endsWith('!') || line.endsWith('?') || // Sentence ending
      line.endsWith(':') || // Colon ending (often precedes lists or new sections)
      (line.length < 60 && nextLine && nextLine.length < 60) || // Both lines are short
      (line.length < 40) || // Very short line (title/heading)
      (nextLine && (
        nextLine.startsWith('"') || // Quote starting
        /^[A-Z][a-z]+ \d+/.test(nextLine) || // Chapter/section pattern
        /^\d+\./.test(nextLine) // Numbered list
      ))
    
    if (isEndOfParagraph) {
      paragraphs.push(currentParagraph.trim())
      currentParagraph = ''
    }
  })
  
  // Join paragraphs with double newlines
  return paragraphs.join('\n\n')
}

// Helper function to determine if we should add space between text items
function shouldAddSpace(lastItem: any, currentItem: any, gap: number): boolean {
  const lastStr = lastItem.str
  const currentStr = currentItem.str
  
  // Always add space if there's a significant gap
  if (gap > 8) return true
  
  // Don't add space if last character is already a space or hyphen
  if (lastStr.endsWith(' ') || lastStr.endsWith('-')) return false
  
  // Don't add space if current text starts with punctuation or space
  if (/^[\s.,;:!?)]/.test(currentStr)) return false
  
  // Don't add space if last text ends with opening punctuation
  if (/[(\[]$/.test(lastStr)) return false
  
  // Check for font changes (might indicate formatting like italics)
  const fontChanged = lastItem.fontName !== currentItem.fontName
  const sizeChanged = Math.abs(lastItem.transform[0] - currentItem.transform[0]) > 1
  
  // If there's a font or size change but small gap, still add space for readability
  if ((fontChanged || sizeChanged) && gap > 2) return true
  
  // Add space if there's any meaningful gap and both items have alphabetic characters
  if (gap > 2 && /[a-zA-Z]$/.test(lastStr) && /^[a-zA-Z]/.test(currentStr)) return true
  
  return false
}

// Helper function to process text formatting indicators
function processTextFormatting(text: string, item: any): string {
  // We can't fully recreate formatting, but we can add some indicators
  // This is a simplified approach - full formatting would require more complex logic
  
  try {
    const fontName = item.fontName || ''
    const isItalic = fontName.toLowerCase().includes('italic') || fontName.toLowerCase().includes('oblique')
    const isBold = fontName.toLowerCase().includes('bold')
    
    // For now, we'll just return the text as-is
    // In a future enhancement, we could wrap with markdown or HTML tags
    // if (isItalic && !isBold) return `*${text}*`
    // if (isBold && !isItalic) return `**${text}**`
    // if (isBold && isItalic) return `***${text}***`
    
    return text
  } catch {
    return text
  }
}

export async function loadPDFFromUrl(url: string): Promise<PDFTextContent> {
  try {
    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided')
    }

    // Get PDF.js dynamically (client-side only)
    const pdfjsLib = await getPDFJS();

    // Try direct access first, fallback to proxy if CORS issues
    let pdfUrl = url
    try {
      // Test if we can access the URL directly
      const testResponse = await fetch(url, { method: 'HEAD' })
      if (!testResponse.ok) {
        throw new Error('Direct access failed')
      }
    } catch {
      // Use proxy for CORS issues
      pdfUrl = `/api/pdf-proxy?url=${encodeURIComponent(url)}`
    }

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages
    const pages: PDFPage[] = []
    let fullText = ''

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      
      // Get text content for search functionality
      const textContent = await page.getTextContent()
      
      // Basic text for search/compatibility
      const basicText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      // Formatted text with better paragraph structure
      const formattedText = extractFormattedText(textContent)
      
      // Render page as canvas to capture visual content (covers, graphics, etc.)
      const viewport = page.getViewport({ scale: 1.5 }) // Higher scale for better quality
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) {
        throw new Error('Failed to get canvas context')
      }
      
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }
      
      try {
        await page.render(renderContext).promise
        
        // Convert canvas to data URL for storage
        const imageDataUrl = canvas.toDataURL('image/png', 0.8)
        
        const pageData: PDFPage = {
          pageNumber: pageNum,
          text: basicText,
          formattedText: formattedText,
          canvas: canvas,
          imageDataUrl: imageDataUrl,
          viewport: viewport
        }
        
        pages.push(pageData)
        fullText += formattedText + '\n\n'
      } catch (renderError) {
        // Fallback to text-only if rendering fails
        const pageData: PDFPage = {
          pageNumber: pageNum,
          text: basicText,
          formattedText: formattedText
        }
        
        pages.push(pageData)
        fullText += formattedText + '\n\n'
      }
    }

    return {
      text: fullText.trim(),
      pages,
      totalPages
    }
  } catch (error) {
    console.error('Error loading PDF:', error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        throw new Error('CORS error: The PDF URL does not allow cross-origin access. Please check the URL and try again.')
      } else if (error.message.includes('404')) {
        throw new Error('PDF not found. Please check the URL and try again.')
      } else if (error.message.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
    }
    
    throw new Error('Failed to load PDF. Please check the URL and try again.')
  }
}

export function formatTextForDisplay(text: string): string {
  // Clean up the text for better readability
  return text
    .replace(/\n{3,}/g, '\n\n') 
    .replace(/\s{2,}/g, ' ') 
    .trim()
} 