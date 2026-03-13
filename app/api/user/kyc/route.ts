import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kyc = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
  return NextResponse.json({ kyc })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
  if (existing && existing.status === 'PENDING_REVIEW') {
    return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
  }
  if (existing?.status === 'APPROVED') {
    return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })
  }

  const formData = await req.formData()
  const fullName    = formData.get('fullName') as string
  const dateOfBirth = formData.get('dateOfBirth') as string
  const address     = formData.get('address') as string
  const document    = formData.get('document') as File

  if (!document || document.size === 0) {
    return NextResponse.json({ error: 'Document required' }, { status: 400 })
  }

  const bytes    = await document.arrayBuffer()
  const buffer   = Buffer.from(bytes)
  const dir      = path.join(process.cwd(), 'uploads', 'kyc')
  await mkdir(dir, { recursive: true })
  const filename = `${user.id}-${Date.now()}${path.extname(document.name)}`
  await writeFile(path.join(dir, filename), buffer)

  if (existing) {
    await prisma.kycSubmission.update({
      where: { userId: user.id },
      data: { fullName, dateOfBirth, address, documentPath: filename, status: 'PENDING_REVIEW', rejectionReason: null, submittedAt: new Date(), reviewedAt: null },
    })
  } else {
    await prisma.kycSubmission.create({
      data: { userId: user.id, fullName, dateOfBirth, address, documentPath: filename, status: 'PENDING_REVIEW' },
    })
  }

  await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

  // Notify admin
  await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id })

  return NextResponse.json({ success: true })
}
