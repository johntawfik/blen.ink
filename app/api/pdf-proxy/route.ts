import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    // Handle malformed double-encoded URLs
    let decodedUrl = decodeURIComponent(url)

    if (decodedUrl.includes('https://https:/')) {
      decodedUrl = decodedUrl.replace('https://https:/', 'https://')
    }
    if (decodedUrl.includes('https:///https%3A')) {
      decodedUrl = decodedUrl.replace('https:///https%3A', 'https://')
    }
    if (decodedUrl.includes('https:////https%253A/')) {
      decodedUrl = decodedUrl.replace('https:////https%253A/', 'https://')
    }
    
    new URL(decodedUrl)
    
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-Viewer/1.0)',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/pdf')) {
      return NextResponse.json(
        { error: 'URL does not point to a PDF file' },
        { status: 400 }
      )
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('PDF proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PDF from the provided URL' },
      { status: 500 }
    )
  }
}