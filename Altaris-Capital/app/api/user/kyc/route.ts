import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import os from 'os'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyUser } from '@/lib/push'
import { notifyAdminTelegram } from '@/lib/push'
import { sendTelegramFile, sendTelegramMessage } from '@/lib/telegram'

const MAX_KYC_BYTES = 10 * 1024 * 1024
const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'])
const ALLOWED_KYC_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.pdf'])
const ALLOWED_SELFIE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif'])

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kyc = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
  const status = kyc?.status ?? user.kycStatus ?? 'NOT_SUBMITTED'
  return NextResponse.json({ kyc, status })
}

export async function POST(req: NextRequest) {
  let stage = 'start'
  try {
    const user = await getAuthUser(req)
    stage = 'auth'
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const existing = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
    stage = 'existing'
    if (existing?.status === 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Your KYC is already under review.' }, { status: 400 })
    }
    if (existing?.status === 'APPROVED') {
      return NextResponse.json({ error: 'KYC already approved.' }, { status: 400 })
    }

    const formData = await req.formData()
    stage = 'formData'
    const firstName    = (formData.get('firstName') as string) || ''
    const lastName     = (formData.get('lastName') as string) || ''
    const fullName     = [firstName, lastName].filter(Boolean).join(' ') || (formData.get('fullName') as string) || ''
    const dateOfBirth  = (formData.get('dob') as string) || (formData.get('dateOfBirth') as string) || ''
    const address      = (formData.get('country') as string) || (formData.get('address') as string) || ''
    const documentType = (formData.get('docType') as string) || ''
    const document     = (formData.get('documentFile') as File) || (formData.get('document') as File)
    const documentBack = (formData.get('documentBackFile') as File) || (formData.get('documentBack') as File) || null

    if (!fullName.trim() || !dateOfBirth.trim() || !address.trim()) {
      return NextResponse.json({ error: 'Full name, date of birth, and address are required' }, { status: 400 })
    }
    stage = 'validation'
    if (!document || document.size === 0) {
      return NextResponse.json({ error: 'Document photo is required' }, { status: 400 })
    }
    if (document.size > MAX_KYC_BYTES) {
      return NextResponse.json({ error: 'Document is too large (max 10MB)' }, { status: 400 })
    }
    const extension = path.extname(document.name || '').toLowerCase()
    if (!ALLOWED_KYC_EXT.has(extension)) {
      return NextResponse.json({ error: 'Invalid document extension. Use JPG, PNG, HEIC, HEIF, or PDF.' }, { status: 400 })
    }
    if (document.type && !ALLOWED_KYC_TYPES.has(document.type)) {
      return NextResponse.json({ error: 'Unsupported document format. Use JPG, PNG, HEIC, HEIF, or PDF.' }, { status: 400 })
    }

    if (documentBack && documentBack.size > 0) {
      if (documentBack.size > MAX_KYC_BYTES) {
        return NextResponse.json({ error: 'Back image is too large (max 10MB)' }, { status: 400 })
      }
      const backExt = path.extname(documentBack.name || '').toLowerCase()
      if (!ALLOWED_SELFIE_EXT.has(backExt) && !ALLOWED_KYC_EXT.has(backExt)) {
        return NextResponse.json({ error: 'Invalid back image extension. Use JPG, PNG, HEIC, HEIF, or PDF.' }, { status: 400 })
      }
      if (documentBack.type && !documentBack.type.startsWith('image/') && documentBack.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Back image must be an image or PDF.' }, { status: 400 })
      }
    }

    const dir = process.env.VERCEL ? path.join(os.tmpdir(), 'altaris-kyc') : path.join(process.cwd(), 'uploads', 'kyc')
    await mkdir(dir, { recursive: true })
    stage = 'mkdir'

    const filename = `${user.id}-${Date.now()}${extension}`
    stage = 'sendTelegramDocument'

    const kycData = {
      fullName, dateOfBirth, address,
      documentType: documentType || null,
      documentPath: filename,
      selfieFile: null,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    }

    if (existing) {
      await prisma.kycSubmission.update({ where: { userId: user.id }, data: kycData })
    } else {
      await prisma.kycSubmission.create({ data: { userId: user.id, ...kycData } })
    }
    stage = 'dbWrite'

    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

    try {
      await trigger(adminChannel, 'admin:kyc_submitted', {
        userId: user.id,
        name: user.name,
        email: user.email,
      })
    } catch (err) {
      console.error('[KYC pusher notify]', err)
    }
    try {
      await notifyAdminTelegram(`🪪 <b>KYC Submitted</b>\nUser: ${user.name}\nEmail: ${user.email}`)
    } catch (err) {
      console.error('[KYC admin telegram notify]', err)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const adminUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/admin/kyc` : '/admin/kyc'
    const text = [
      '🛡️ <b>New Altaris KYC Submission</b>',
      `User: <b>${escapeHtml(user.name || 'Unknown')}</b>`,
      `Email: <code>${escapeHtml(user.email || '')}</code>`,
      `Full name: <b>${escapeHtml(fullName)}</b>`,
      `DOB: <code>${escapeHtml(dateOfBirth)}</code>`,
      `Country/address: ${escapeHtml(address)}`,
      `Document: ${escapeHtml(documentType || '—')}`,
      `Review: ${escapeHtml(adminUrl)}`,
    ].join('\n')
    try {
      await sendTelegramFile({ field: 'document', file: document, caption: 'KYC front ID' })
      await sendTelegramMessage(text)
      if (documentBack && documentBack.size > 0) await sendTelegramFile({ field: 'photo', file: documentBack, caption: 'KYC back ID' })
    } catch (telegramErr) {
      console.error('[KYC Telegram notify]', telegramErr)
    }

    try {
      await notifyUser(
        prisma, user.id,
        'KYC Submitted',
        'Your identity documents have been submitted and are under review. We\'ll notify you within 1-2 business days.',
        '/kyc'
      )
    } catch (err) {
      console.error('[KYC user notify]', err)
    }
    stage = 'done'

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[KYC submit]', e?.message ?? e)
    return NextResponse.json({ error: `Failed to submit KYC at ${typeof stage !== 'undefined' ? stage : 'unknown'}: ${e?.message ?? 'unknown error'}` }, { status: 500 })
  }
}
