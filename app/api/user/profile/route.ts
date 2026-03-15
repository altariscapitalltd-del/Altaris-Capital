import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_AVATAR_BYTES = 8 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const ALLOWED_AVATAR_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'])

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      balances: true,
      investments: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } },
      notifications: { where: { read: false }, take: 10, orderBy: { createdAt: 'desc' } },
    },
  })
  return NextResponse.json({ user: full })
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const name = (formData.get('name') as string)?.trim()
    const phone = (formData.get('phone') as string)?.trim()
    const file = formData.get('avatar') as File | null

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }

    let profilePicture: string | undefined
    if (file && file.size > 0) {
      if (file.size > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: 'Avatar file is too large (max 8MB)' }, { status: 400 })
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
        const blob = await put(filename, file, { access: 'public', addRandomSuffix: true })
        profilePicture = blob.url
      } else if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
        const bytes = await file.arrayBuffer()
        const mime = hasMimeType ? file.type : 'image/jpeg'
        profilePicture = `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
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

    return NextResponse.json({ success: true, user: updated })
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export const PATCH = PUT
