import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const ALLOWED_AVATAR_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'])

function isVercelBlobUrl(url: string) {
  try {
    const u = new URL(url)
    return u.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

function normalizeProfilePicture<T extends { profilePicture: string | null }>(record: T) {
  if (record.profilePicture && isVercelBlobUrl(record.profilePicture)) {
    return {
      ...record,
      profilePicture: `/api/user/avatar/blob?src=${encodeURIComponent(record.profilePicture)}`
    }
  }
  return record
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      balances: true,
      investments: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } },
      notifications: { where: { read: false }, take: 10, orderBy: { createdAt: 'desc' } },
      outgoingReferrals: { include: { referredUser: { select: { id: true, name: true, email: true, kycStatus: true, emailVerifiedAt: true } } } },
      rewardEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  return NextResponse.json({ user: full ? normalizeProfilePicture(full) : null })
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contentType = req.headers.get('content-type') || ''
    let name = ''
    let phone = ''
    let file: File | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
      }
      name = String((body as any).name || '').trim()
      phone = String((body as any).phone || '').trim()
    } else {
      const formData = await req.formData()
      name = String(formData.get('name') || '').trim()
      phone = String(formData.get('phone') || '').trim()
      file = formData.get('avatar') as File | null
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }

    let profilePicture: string | undefined
    if (file && file.size > 0) {
      if (file.size > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: 'Avatar file is too large (max 5MB)' }, { status: 400 })
      }
      const ext = (path.extname(file.name) || '.jpg').toLowerCase()
      if (!ALLOWED_AVATAR_EXT.has(ext)) {
        return NextResponse.json({ error: 'Invalid avatar file extension' }, { status: 400 })
      }

      const hasMimeType = typeof file.type === 'string' && file.type.length > 0
      if (hasMimeType && !ALLOWED_AVATAR_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported avatar format' }, { status: 400 })
      }

      const filename = `avatars/${user.id}-${Date.now()}${ext}`

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob')
        const blob = await put(filename, file, { access: 'private', addRandomSuffix: true })
        profilePicture = blob.url
      } else {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const dir = path.join(process.cwd(), 'uploads', 'avatars')
        await mkdir(dir, { recursive: true })
        const localFilename = `${user.id}-${Date.now()}${ext}`
        await writeFile(path.join(dir, localFilename), buffer)
        profilePicture = `/api/user/avatar/${localFilename}`
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, phone, ...(profilePicture && { profilePicture }) },
    })

    return NextResponse.json({ success: true, user: normalizeProfilePicture(updated) })
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export const PATCH = PUT
