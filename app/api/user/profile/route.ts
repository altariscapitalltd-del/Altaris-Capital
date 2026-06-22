export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { calcInvestmentState, calcInvestmentSummary } from '@/lib/investmentMath'

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

function buildMockUser(user: { id: string; email: string; name: string; role: string; kycStatus: string; bonusClaimed: boolean }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    kycStatus: 'APPROVED',
    isActive: true,
    withdrawEnabled: true,
    bonusClaimed: false,
    profilePicture: null,
    phone: '+234 000 000 0000',
    balances: [
      { id: 'mock-usd', userId: user.id, currency: 'USD', amount: 12580.42 },
      { id: 'mock-btc', userId: user.id, currency: 'BTC', amount: 0.1842 },
      { id: 'mock-eth', userId: user.id, currency: 'ETH', amount: 2.75 },
      { id: 'mock-usdt', userId: user.id, currency: 'USDT', amount: 3400.0 },
    ],
    investments: [
      {
        id: 'mock-invest-1',
        userId: user.id,
        planId: 'defi-accelerator',
        planName: 'DeFi Accelerator',
        amount: 3000,
        dailyRoi: 0.035,
        startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        totalEarned: 420,
      },
      {
        id: 'mock-invest-2',
        userId: user.id,
        planId: 'smart-yield',
        planName: 'Smart Yield',
        amount: 1800,
        dailyRoi: 0.028,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        totalEarned: 100.8,
      },
    ],
    notifications: [
      {
        id: 'mock-notify-1',
        userId: user.id,
        title: 'Welcome to Altaris Capital',
        body: 'Your demo dashboard is ready.',
        type: 'info',
        read: false,
        url: '/home',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        balances: true,
        investments: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } },
        notifications: { where: { read: false }, take: 10, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!full) return NextResponse.json({ user: null })
    const investments = full.investments.map((inv) => ({ ...inv, ...calcInvestmentState(inv) }))
    // Never expose private keys to the client; keep addresses only.
    const { walletPrivateKey, onchainSeen, ...safe } = full as any
    if (safe.chainWallets && typeof safe.chainWallets === 'object') {
      const cw: any = {}
      for (const k of ['btc', 'sol', 'xrp']) if (safe.chainWallets[k]?.address) cw[k] = { address: safe.chainWallets[k].address }
      safe.chainWallets = cw
    }
    return NextResponse.json({
      user: normalizeProfilePicture({
        ...safe,
        investments,
        investmentSummary: calcInvestmentSummary(investments),
      }),
    })
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ user: buildMockUser({
        id: String(user.id),
        email: (user as any).email || 'demo@altariscapital.ltd',
        name: String(user.name || 'Demo User'),
        role: String((user as any).role || 'USER'),
        kycStatus: String((user as any).kycStatus || 'APPROVED'),
        bonusClaimed: Boolean((user as any).bonusClaimed),
      }) })
    }
    return NextResponse.json({ error: 'Profile unavailable' }, { status: 503 })
  }
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
