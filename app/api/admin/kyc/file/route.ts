import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const file = new URL(req.url).searchParams.get('file')
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
  const safe = path.basename(file)
  const absolute = path.join(process.cwd(), 'uploads', 'kyc', safe)
  try {
    const buffer = await readFile(absolute)
    const ext = path.extname(safe).toLowerCase()
    const type = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg'
    return new NextResponse(buffer, { headers: { 'Content-Type': type, 'Content-Disposition': `inline; filename="${safe}"` } })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
