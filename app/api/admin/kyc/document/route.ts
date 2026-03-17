import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('path') || ''
  if (!raw) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  if (/^https?:\/\//i.test(raw)) {
    return NextResponse.redirect(raw)
  }

  const clean = path.basename(raw)
  const fullPath = path.join(process.cwd(), 'uploads', 'kyc', clean)

  try {
    const file = await readFile(fullPath)
    const ext = path.extname(clean).toLowerCase()
    const contentType = ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg'

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
        'Content-Disposition': `inline; filename="${clean}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }
}
