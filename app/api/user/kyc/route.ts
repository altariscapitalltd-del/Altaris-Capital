import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { sendTelegramDocument, sendTelegramPhoto } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])

async function persistUpload(file: File, prefix: string, allowedTypes = ALLOWED_KYC_TYPES, allowedExt = ALLOWED_KYC_EXT) {
  if (!file || file.size === 0) throw new Error('Missing file')
  if (file.size > MAX_KYC_BYTES) throw new Error('File is too large (max 10MB)')
  if (!allowedTypes.has(file.type)) throw new Error('Unsupported file format')

  const extension = path.extname(file.name).toLowerCase()
  if (!allowedExt.has(extension)) throw new Error('Invalid file extension')

  const buffer = Buffer.from(await file.arrayBuffer())
  const dir = path.join(process.cwd(), 'uploads', 'kyc')
  await mkdir(dir, { recursive: true })
  const filename = `${prefix}-${Date.now()}${extension}`
  await writeFile(path.join(dir, filename), buffer)
  return { filename, buffer, contentType: file.type || 'application/octet-stream' }
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
    if (existing && existing.status === 'PENDING_REVIEW') return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
    if (existing?.status === 'APPROVED') return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })

    const formData = await req.formData()
    const firstName = String(formData.get('firstName') || '').trim()
    const lastName = String(formData.get('lastName') || '').trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ')
    const dateOfBirth = String(formData.get('dob') || '').trim()
    const country = String(formData.get('country') || '').trim()
    const address = String(formData.get('address') || country).trim()
    const documentType = String(formData.get('docType') || '').trim()
    const documentNumber = String(formData.get('docNumber') || '').trim()
    const document = formData.get('documentFile') as File | null
    const selfie = formData.get('selfieFile') as File | null

    if (!fullName || !dateOfBirth || !country || !documentType || !documentNumber) {
      return NextResponse.json({ error: 'Complete every identity field before submitting.' }, { status: 400 })
    }
    if (!document) return NextResponse.json({ error: 'Document upload is required.' }, { status: 400 })
    if (!selfie) return NextResponse.json({ error: 'Selfie upload is required.' }, { status: 400 })

    const documentUpload = await persistUpload(document, `${user.id}-document`)
    const selfieUpload = await persistUpload(selfie, `${user.id}-selfie`, new Set(['image/jpeg', 'image/png']), new Set(['.jpg', '.jpeg', '.png']))

    const payload = {
      fullName,
      dateOfBirth,
      address,
      country,
      documentType,
      documentNumber,
      documentPath: documentUpload.filename,
      selfiePath: selfieUpload.filename,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    }

    if (existing) await prisma.kycSubmission.update({ where: { userId: user.id }, data: payload })
    else await prisma.kycSubmission.create({ data: { userId: user.id, ...payload } })

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

    const caption = [`KYC submission`, `User: ${user.name} (${user.email})`, `Full name: ${fullName}`, `DOB: ${dateOfBirth}`, `Country: ${country}`, `Document: ${documentType} · ${documentNumber}`].join('\n')
    await sendTelegramDocument({ filename: documentUpload.filename, contentType: documentUpload.contentType, buffer: documentUpload.buffer, caption })
    await sendTelegramPhoto({ filename: selfieUpload.filename, contentType: selfieUpload.contentType, buffer: selfieUpload.buffer, caption: `${fullName} selfie` })

    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id, name: user.name, submittedAt: new Date().toISOString() })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit KYC' }, { status: 500 })
  }
}
