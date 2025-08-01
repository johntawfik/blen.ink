import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { readdirSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Find the file that starts with this ID
    const uploadsDir = path.join(process.cwd(), 'uploads')
    let filename: string | null = null
    
    try {
      const files = readdirSync(uploadsDir)
      filename = files.find(file => file.startsWith(`${id}-`)) || null
    } catch (error) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (!filename) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read the file
    const filePath = path.join(uploadsDir, filename)
    const buffer = await readFile(filePath)

    // Return the PDF file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${filename.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '')}"`,
        'X-Original-Filename': filename.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, ''), // Remove UUID prefix
      },
    })

  } catch (error) {
    console.error('Serve file error:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
} 