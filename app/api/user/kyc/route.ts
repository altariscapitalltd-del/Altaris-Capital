import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { sendKycToTelegram } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const ALLOWED_SELFIE_TYPES = new Set(['image/jpeg', 'image/png'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])

async function saveFile(file: File, userId: string, suffix: string) {
  const extension = path.extname(file.name).toLowerCase() || '.jpg'
  if (!ALLOWED_KYC_EXT.has(extension)) throw new Error('Invalid file extension')
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const dir = path.join(process.cwd(), 'uploads', 'kyc')
  await mkdir(dir, { recursive: true })
  const filename = `${userId}-${suffix}-${Date.now()}${extension}`
  await writeFile(path.join(dir, filename), buffer)
  return filename
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
    if (existing?.status === 'PENDING_REVIEW') return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
    if (existing?.status === 'APPROVED') return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })

    const formData = await req.formData()
    const firstName = String(formData.get('firstName') || '')
    const lastName = String(formData.get('lastName') || '')
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || String(formData.get('fullName') || '')
    const dateOfBirth = String(formData.get('dob') || formData.get('dateOfBirth') || '')
    const country = String(formData.get('country') || '')
    const address = String(formData.get('address') || country)
    const documentType = String(formData.get('docType') || formData.get('documentType') || '')
    const documentNumber = String(formData.get('docNumber') || formData.get('documentNumber') || '')
    const document = ((formData.get('documentFile') as File) || (formData.get('document') as File))
    const selfie = ((formData.get('selfieFile') as File) || (formData.get('selfie') as File))

    if (!fullName.trim() || !dateOfBirth.trim() || !country.trim()) return NextResponse.json({ error: 'Full name, date of birth, and country are required' }, { status: 400 })
    if (!document || document.size === 0) return NextResponse.json({ error: 'Document required' }, { status: 400 })
    if (!selfie || selfie.size === 0) return NextResponse.json({ error: 'Selfie required' }, { status: 400 })
    if (document.size > MAX_KYC_BYTES || selfie.size > MAX_KYC_BYTES) return NextResponse.json({ error: 'Files must be 10MB or less' }, { status: 400 })
    if (!ALLOWED_KYC_TYPES.has(document.type)) return NextResponse.json({ error: 'Unsupported document format' }, { status: 400 })
    if (!ALLOWED_SELFIE_TYPES.has(selfie.type)) return NextResponse.json({ error: 'Unsupported selfie format' }, { status: 400 })

    const documentPath = await saveFile(document, user.id, 'document')
    const selfiePath = await saveFile(selfie, user.id, 'selfie')

    const data = {
      fullName,
      dateOfBirth,
      address,
      country,
      documentType,
      documentNumber,
      documentPath,
      selfiePath,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
      telegramDeliveredAt: null,
    }

    const submission = existing
      ? await prisma.kycSubmission.update({ where: { userId: user.id }, data })
      : await prisma.kycSubmission.create({ data: { userId: user.id, ...data } })

    let telegramDeliveredAt: Date | null = null
    try {
      const result = await sendKycToTelegram({
        user: { id: user.id, name: user.name, email: user.email },
        fullName,
        dateOfBirth,
        country,
        address,
        documentType,
        documentNumber,
        documentPath,
        selfiePath,
      })
      if (result.delivered) telegramDeliveredAt = new Date()
    } catch (error) {
      console.error('Telegram KYC delivery failed', error)
    }

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })
    if (telegramDeliveredAt) {
      await prisma.kycSubmission.update({ where: { id: submission.id }, data: { telegramDeliveredAt } })
    }

    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id })
    return NextResponse.json({ success: true, telegramDelivered: Boolean(telegramDeliveredAt) })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 })
  }
}
