import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const name  = formData.get('name') as string
  const phone = formData.get('phone') as string
  const file  = formData.get('avatar') as File | null

  let profilePicture: string | undefined
  if (file && file.size > 0) {
    const ext = path.extname(file.name) || '.jpg'
    const filename = `avatars/${user.id}-${Date.now()}${ext}`

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob')
      const blob = await put(filename, file, { access: 'public', addRandomSuffix: true })
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

  return NextResponse.json({ success: true, user: updated })
}

export const PATCH = PUT
