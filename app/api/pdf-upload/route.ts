import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 50MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileId = uuidv4()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') // Sanitize filename
    const filename = `${fileId}-${originalName}`
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save file to uploads directory
    const uploadPath = path.join(process.cwd(), 'uploads', filename)
    await writeFile(uploadPath, buffer)

    // Return the file ID and metadata
    return NextResponse.json({
      success: true,
      fileId,
      filename: originalName,
      size: file.size,
      uploadPath: `/api/pdf-upload/${fileId}`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 