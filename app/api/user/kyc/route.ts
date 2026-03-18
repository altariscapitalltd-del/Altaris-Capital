import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { markReferralKycStatus, tryQualifyReferral } from '@/lib/referrals'
import { sendTelegramFile, sendTelegramMessage } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const ALLOWED_SELFIE_TYPES = new Set(['image/jpeg', 'image/png'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])

async function saveFile(userId: string, prefix: string, file: File) {
  const extension = path.extname(file.name).toLowerCase()
  const dir = path.join(process.cwd(), 'uploads', 'kyc')
  await mkdir(dir, { recursive: true })
  const filename = `${userId}-${prefix}-${Date.now()}${extension}`
  const bytes = await file.arrayBuffer()
  await writeFile(path.join(dir, filename), Buffer.from(bytes))
  return { filename, absolutePath: path.join(dir, filename), extension }
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
    const address = String(formData.get('address') || country || '')
    const documentType = String(formData.get('docType') || formData.get('documentType') || '')
    const documentNumber = String(formData.get('docNumber') || formData.get('documentNumber') || '')
    const document = (formData.get('documentFile') as File) || (formData.get('document') as File)
    const selfie = (formData.get('selfieFile') as File) || (formData.get('selfie') as File)

    if (!fullName.trim() || !dateOfBirth.trim() || !country.trim() || !documentType.trim() || !documentNumber.trim()) {
      return NextResponse.json({ error: 'Complete all identity fields before submitting.' }, { status: 400 })
    }
    if (!document || document.size === 0) return NextResponse.json({ error: 'Document required' }, { status: 400 })
    if (!selfie || selfie.size === 0) return NextResponse.json({ error: 'Selfie required' }, { status: 400 })
    if (document.size > MAX_KYC_BYTES || selfie.size > MAX_KYC_BYTES) return NextResponse.json({ error: 'Each file must be under 10MB.' }, { status: 400 })
    if (!ALLOWED_KYC_TYPES.has(document.type)) return NextResponse.json({ error: 'Unsupported document format' }, { status: 400 })
    if (!ALLOWED_SELFIE_TYPES.has(selfie.type)) return NextResponse.json({ error: 'Unsupported selfie format' }, { status: 400 })

    const documentExt = path.extname(document.name).toLowerCase()
    const selfieExt = path.extname(selfie.name).toLowerCase()
    if (!ALLOWED_KYC_EXT.has(documentExt) || !ALLOWED_KYC_EXT.has(selfieExt)) return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 })

    const savedDocument = await saveFile(user.id, 'document', document)
    const savedSelfie = await saveFile(user.id, 'selfie', selfie)

    const payload = {
      fullName,
      dateOfBirth,
      address,
      country,
      documentType,
      documentNumber,
      documentPath: savedDocument.filename,
      selfiePath: savedSelfie.filename,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    }

    if (existing) await prisma.kycSubmission.update({ where: { userId: user.id }, data: payload })
    else await prisma.kycSubmission.create({ data: { userId: user.id, ...payload } })

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })
    await markReferralKycStatus(user.id, false)

    const summary = [
      '<b>New KYC submission</b>',
      `User: ${user.name} (${user.email})`,
      `Full name: ${fullName}`,
      `Country: ${country}`,
      `Document: ${documentType} / ${documentNumber}`,
      `Submitted: ${new Date().toISOString()}`,
    ].join('\n')
    await sendTelegramMessage(summary)
    await sendTelegramFile(savedDocument.absolutePath, savedDocument.filename, `${user.email} — identity document`, document.type === 'application/pdf' ? 'document' : 'photo')
    await sendTelegramFile(savedSelfie.absolutePath, savedSelfie.filename, `${user.email} — selfie`, 'photo')

    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('KYC submission failed', error)
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 })
  }
}
