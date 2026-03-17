import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf'])

function extFromMime(type: string) {
  if (type === 'image/jpeg') return '.jpg'
  if (type === 'image/png') return '.png'
  if (type === 'image/webp') return '.webp'
  if (type === 'application/pdf') return '.pdf'
  return ''
}

async function storeKycAsset(file: File, userId: string) {
  const extension = (path.extname(file.name).toLowerCase() || extFromMime(file.type) || '.jpg')
  if (!ALLOWED_KYC_EXT.has(extension)) {
    throw new Error('Invalid document extension')
  }

  const filename = `kyc/${userId}-${Date.now()}${extension}`

  // Preferred: persistent blob storage when configured.
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob')
      const blob = await put(filename, file, { access: 'private', addRandomSuffix: true })
      return blob.url
    }
  } catch {
    // fallback to local storage below
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const dir = path.join(process.cwd(), 'uploads', 'kyc')
  await mkdir(dir, { recursive: true })
  const localName = `${userId}-${Date.now()}${extension}`
  await writeFile(path.join(dir, localName), buffer)
  return localName
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kyc = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
  const status = kyc?.status ?? user.kycStatus ?? 'NOT_SUBMITTED'
  return NextResponse.json({ kyc, status })
}

export async function POST(req: NextRequest) {
  try {
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
    const firstName = (formData.get('firstName') as string) || ''
    const lastName = (formData.get('lastName') as string) || ''
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || (formData.get('fullName') as string) || ''
    const dateOfBirth = (formData.get('dob') as string) || (formData.get('dateOfBirth') as string) || ''
    const address = (formData.get('country') as string) || (formData.get('address') as string) || ''
    const documentFile = (formData.get('documentFile') as File) || (formData.get('document') as File)
    const selfieFile = (formData.get('selfieFile') as File) || (formData.get('selfie') as File)

    const evidenceFile = selfieFile?.size ? selfieFile : documentFile

    if (!fullName.trim() || !dateOfBirth.trim() || !address.trim()) {
      return NextResponse.json({ error: 'Full name, date of birth, and country are required' }, { status: 400 })
    }
    if (!evidenceFile || evidenceFile.size === 0) {
      return NextResponse.json({ error: 'Please upload a verification selfie.' }, { status: 400 })
    }
    if (evidenceFile.size > MAX_KYC_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 10MB)' }, { status: 400 })
    }
    if (!ALLOWED_KYC_TYPES.has(evidenceFile.type)) {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 })
    }

    const storedPath = await storeKycAsset(evidenceFile, user.id)

    if (existing) {
      await prisma.kycSubmission.update({
        where: { userId: user.id },
        data: {
          fullName,
          dateOfBirth,
          address,
          documentPath: storedPath,
          status: 'PENDING_REVIEW',
          rejectionReason: null,
          submittedAt: new Date(),
          reviewedAt: null,
        },
      })
    } else {
      await prisma.kycSubmission.create({
        data: { userId: user.id, fullName, dateOfBirth, address, documentPath: storedPath, status: 'PENDING_REVIEW' },
      })
    }

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })
    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 })
  }
}
