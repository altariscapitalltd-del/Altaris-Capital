import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyUser } from '@/lib/push'

function esc(v: string) { return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

async function blobUrlToFile(url: string, fallbackName: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
  if (!res.ok) throw new Error(`Failed to fetch KYC file: ${res.status}`)
  const type = res.headers.get('content-type') || 'application/octet-stream'
  const bytes = await res.arrayBuffer()
  return new File([bytes], fallbackName, { type })
}

async function telegramSendMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.KYC_TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_KYC_CHAT_ID || process.env.KYC_TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram is not configured')
  const body = new FormData()
  body.set('chat_id', chatId)
  body.set('text', text)
  body.set('parse_mode', 'HTML')
  body.set('disable_web_page_preview', 'true')
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', body })
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status}`)
}

async function telegramSendFile(method: 'sendDocument' | 'sendPhoto', file: File, caption: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.KYC_TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_KYC_CHAT_ID || process.env.KYC_TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('Telegram is not configured')
  const body = new FormData()
  body.set('chat_id', chatId)
  body.set('caption', caption)
  const bytes = Buffer.from(await file.arrayBuffer())
  body.set(method === 'sendPhoto' ? 'photo' : 'document', new Blob([bytes], { type: file.type || 'application/octet-stream' }), file.name || `kyc-${Date.now()}`)
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body })
  if (!res.ok) throw new Error(`Telegram ${method} failed: ${res.status}`)
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

    await Promise.allSettled([
      telegramSendMessage(telegram),
      blobUrlToFile(frontUrl, 'kyc-front.jpg').then(file => telegramSendFile('sendDocument', file, 'KYC front ID')),
      blobUrlToFile(backUrl, 'kyc-back.jpg').then(file => telegramSendFile('sendPhoto', file, 'KYC back ID')),
      trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id, name: user.name, email: user.email }),
      notifyUser(prisma, user.id, 'KYC Submitted', 'Your documents are under review.', '/kyc'),
    ])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to submit KYC' }, { status: 500 })
  }
}
