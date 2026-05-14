import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const { filename } = params
  if (!filename) return NextResponse.json({ error: 'Missing filename' }, { status: 400 })

  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars')
  const filePath = path.join(uploadsDir, filename)

  try {
    const buf = await fs.readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const contentType = MIME_MAP[ext] || 'application/octet-stream'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
