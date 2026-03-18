import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { trigger, adminChannel } from '@/lib/pusher'
import { sendTelegramDocument, sendTelegramMessage } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_DOC_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const ALLOWED_DOC_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])
const ALLOWED_SELFIE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_SELFIE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])

async function persistUpload(file: File, userId: string, suffix: string, allowedExt: Set<string>) {
  const extension = path.extname(file.name).toLowerCase() || '.jpg'
  if (!allowedExt.has(extension)) throw new Error('Invalid file extension')
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
    if (existing?.status === 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
    }
    if (existing?.status === 'APPROVED') {
      return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })
    }

    const formData = await req.formData()
    const firstName = String(formData.get('firstName') || '').trim()
    const lastName = String(formData.get('lastName') || '').trim()
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || String(formData.get('fullName') || '').trim()
    const dateOfBirth = String(formData.get('dob') || formData.get('dateOfBirth') || '').trim()
    const address = String(formData.get('country') || formData.get('address') || '').trim()
    const documentType = String(formData.get('docType') || '').trim()
    const documentNumber = String(formData.get('docNumber') || '').trim()
    const document = formData.get('documentFile') as File | null
    const selfie = formData.get('selfieFile') as File | null

    if (!fullName || !dateOfBirth || !address || !documentType || !documentNumber) {
      return NextResponse.json({ error: 'Please complete every required field before submitting.' }, { status: 400 })
    }
    if (!document || document.size === 0) return NextResponse.json({ error: 'Document required' }, { status: 400 })
    if (!selfie || selfie.size === 0) return NextResponse.json({ error: 'Selfie required' }, { status: 400 })
    if (document.size > MAX_KYC_BYTES || selfie.size > MAX_KYC_BYTES) {
      return NextResponse.json({ error: 'Files must be smaller than 10MB each' }, { status: 400 })
    }
    if (!ALLOWED_DOC_TYPES.has(document.type)) return NextResponse.json({ error: 'Unsupported document format' }, { status: 400 })
    if (!ALLOWED_SELFIE_TYPES.has(selfie.type)) return NextResponse.json({ error: 'Unsupported selfie format' }, { status: 400 })

    const [documentPath, selfiePath] = await Promise.all([
      persistUpload(document, user.id, 'document', ALLOWED_DOC_EXT),
      persistUpload(selfie, user.id, 'selfie', ALLOWED_SELFIE_EXT),
    ])

    let telegramDeliveryState = 'not-configured'
    try {
      const text = [
        '<b>New KYC submission</b>',
        `User: ${user.name} (${user.email})`,
        `Full name: ${fullName}`,
        `DOB: ${dateOfBirth}`,
        `Address: ${address}`,
        `Document type: ${documentType}`,
        `Document number: ${documentNumber}`,
      ].join('\n')
      const [msgRes, docRes, selfieRes] = await Promise.all([
        sendTelegramMessage(text),
        sendTelegramDocument(document, `${user.email} · ${documentType} · document`),
        sendTelegramDocument(selfie, `${user.email} · selfie`),
      ])
      telegramDeliveryState = msgRes.ok && docRes.ok && selfieRes.ok ? 'sent' : 'partial'
    } catch {
      telegramDeliveryState = 'failed'
    }

    const data = { fullName, dateOfBirth, address, documentType, documentNumber, documentPath, selfiePath, telegramDeliveryState, status: 'PENDING_REVIEW' as const, rejectionReason: null, submittedAt: new Date(), reviewedAt: null }
    if (existing) {
      await prisma.kycSubmission.update({ where: { userId: user.id }, data })
    } else {
      await prisma.kycSubmission.create({ data: { userId: user.id, ...data } })
    }

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })
    await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id, name: user.name, email: user.email })
    await sendTelegramMessage(`<b>KYC review queue updated</b>\n${user.name} submitted documents and is now pending review.`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit KYC' }, { status: 500 })
  }
}
