import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { refreshReferralProgress } from '@/lib/referrals'
import { sendTelegramFile, sendTelegramText, telegramEnabled } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])
const ALLOWED_SELFIE_TYPES = new Set(['image/jpeg', 'image/png'])
const ALLOWED_SELFIE_EXT = new Set(['.jpg', '.jpeg', '.png'])

async function persistFile(file: File, prefix: string, folder: string, allowedExt: Set<string>) {
  const extension = path.extname(file.name).toLowerCase()
  if (!allowedExt.has(extension)) throw new Error('Invalid file extension')
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const dir = path.join(process.cwd(), 'uploads', folder)
  await mkdir(dir, { recursive: true })
  const filename = `${prefix}-${Date.now()}${extension}`
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
    const firstName = String(formData.get('firstName') || '').trim()
    const lastName = String(formData.get('lastName') || '').trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ')
    const dateOfBirth = String(formData.get('dob') || formData.get('dateOfBirth') || '').trim()
    const country = String(formData.get('country') || '').trim()
    const address = String(formData.get('address') || country).trim()
    const documentType = String(formData.get('docType') || '').trim()
    const documentNumber = String(formData.get('docNumber') || '').trim()
    const document = (formData.get('documentFile') as File) || (formData.get('document') as File)
    const selfie = (formData.get('selfieFile') as File) || (formData.get('selfie') as File)

    if (!fullName || !dateOfBirth || !country || !documentType || !documentNumber) {
      return NextResponse.json({ error: 'Please complete all required identity fields.' }, { status: 400 })
    }
    if (!document || document.size === 0) return NextResponse.json({ error: 'Document required' }, { status: 400 })
    if (!selfie || selfie.size === 0) return NextResponse.json({ error: 'Selfie required' }, { status: 400 })
    if (document.size > MAX_KYC_BYTES || selfie.size > MAX_KYC_BYTES) {
      return NextResponse.json({ error: 'Files must be 10MB or smaller.' }, { status: 400 })
    }
    if (!ALLOWED_KYC_TYPES.has(document.type)) return NextResponse.json({ error: 'Unsupported document format' }, { status: 400 })
    if (!ALLOWED_SELFIE_TYPES.has(selfie.type)) return NextResponse.json({ error: 'Unsupported selfie format' }, { status: 400 })

    const [documentPath, selfiePath] = await Promise.all([
      persistFile(document, `${user.id}-document`, 'kyc', ALLOWED_KYC_EXT),
      persistFile(selfie, `${user.id}-selfie`, 'kyc', ALLOWED_SELFIE_EXT),
    ])

    const payload = {
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
    }

    if (existing) await prisma.kycSubmission.update({ where: { userId: user.id }, data: payload })
    else await prisma.kycSubmission.create({ data: { userId: user.id, ...payload } })

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

    if (telegramEnabled()) {
      const caption = [`<b>New KYC Submission</b>`, `Name: ${fullName}`, `Email: ${user.email}`, `Country: ${country}`, `Document: ${documentType} (${documentNumber})`].join('\n')
      await sendTelegramText(caption)
      await sendTelegramFile('document', document, `KYC document — ${fullName}`)
      await sendTelegramFile('photo', selfie, `KYC selfie — ${fullName}`)
    }

    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('KYC submission failed', error)
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 })
  }
}
