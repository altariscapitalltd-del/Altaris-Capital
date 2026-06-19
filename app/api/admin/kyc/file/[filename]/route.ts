export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getAdminUser } from '@/lib/auth'

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
}

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const filename = path.basename(params.filename || '')
  if (!filename || filename !== params.filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'kyc', filename)

  try {
    const buf = await fs.readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
