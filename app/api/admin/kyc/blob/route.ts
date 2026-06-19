export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'

function isTrustedBlobUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const src = req.nextUrl.searchParams.get('src')
  if (!src || !isTrustedBlobUrl(src)) {
    return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 })

  const upstream = await fetch(src, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null)
  if (!upstream || !upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Unable to load blob' }, { status: 404 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
