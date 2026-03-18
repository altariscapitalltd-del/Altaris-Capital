import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const filePath = path.join(process.cwd(), 'uploads', 'kyc', params.filename)
    const file = await readFile(filePath)
    const ext = path.extname(params.filename).toLowerCase()
    const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg'
    return new NextResponse(file, { headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=60' } })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
