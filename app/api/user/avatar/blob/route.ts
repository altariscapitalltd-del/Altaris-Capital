import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isTrustedBlobUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const src = req.nextUrl.searchParams.get('src')
  if (!src || !isTrustedBlobUrl(src)) {
    return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 })
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profilePicture: true },
  })

  if (!full?.profilePicture || full.profilePicture !== src) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 })
  }

  const upstream = await fetch(src, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  }).catch(() => null)

  if (!upstream || !upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Unable to load avatar' }, { status: 404 })
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
