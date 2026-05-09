import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyUser } from '@/lib/push'
import { sendTelegramFile, sendTelegramMessage } from '@/lib/telegram'

function esc(v: string) { return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

async function blobUrlToFile(url: string, fallbackName: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
  if (!res.ok) throw new Error(`Failed to fetch KYC file: ${res.status}`)
  const type = res.headers.get('content-type') || 'application/octet-stream'
  const bytes = await res.arrayBuffer()
  return new File([bytes], fallbackName, { type })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fullName, dob, country, docType, frontUrl, backUrl } = await req.json()
    if (!fullName || !dob || !country || !docType || !frontUrl || !backUrl) {
      return NextResponse.json({ error: 'Missing required KYC fields' }, { status: 400 })
    }

    const existing = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
    const record = {
      fullName,
      dateOfBirth: dob,
      address: country,
      documentType: docType,
      documentPath: frontUrl,
      selfieFile: backUrl,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    }
    if (existing) await prisma.kycSubmission.update({ where: { userId: user.id }, data: record })
    else await prisma.kycSubmission.create({ data: { userId: user.id, ...record } })
    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

    const telegram = [
      '<b>🛡️ New KYC Submission</b>',
      `<b>User:</b> ${esc(user.name || 'Unknown')}`,
      `<b>Email:</b> ${esc(user.email || '')}`,
      `<b>Full Name:</b> ${esc(fullName)}`,
      `<b>DOB:</b> ${esc(dob)}`,
      `<b>Country:</b> ${esc(country)}`,
      `<b>Document Type:</b> ${esc(docType)}`,
    ].join('\n')

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    const telegramSend = token && chatId
      ? Promise.all([
          sendTelegramMessage(telegram),
          blobUrlToFile(frontUrl, 'kyc-front.jpg').then(file => sendTelegramFile({ field: 'document', file, caption: 'KYC front ID' })),
          blobUrlToFile(backUrl, 'kyc-back.jpg').then(file => sendTelegramFile({ field: 'photo', file, caption: 'KYC back ID' })),
        ])
      : Promise.resolve()

    void telegramSend.catch(() => {})
    void trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id, name: user.name, email: user.email }).catch(() => {})
    void notifyUser(prisma, user.id, 'KYC Submitted', 'Your documents are under review.', '/kyc').catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to submit KYC' }, { status: 500 })
  }
}
