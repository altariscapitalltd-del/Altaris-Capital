import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyUser } from '@/lib/push'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { fullName, dob, country, docType, documentFrontUrl, documentBackUrl, selfieUrl } = body || {}
    if (!fullName || !dob || !country || !docType || !documentFrontUrl || !documentBackUrl || !selfieUrl) {
      return NextResponse.json({ error: 'Missing required KYC fields' }, { status: 400 })
    }

    const existing = await prisma.kycSubmission.findUnique({ where: { userId: user.id } })
    const record = {
      fullName,
      dateOfBirth: dob,
      address: country,
      documentType: docType,
      documentPath: documentFrontUrl,
      selfieFile: selfieUrl,
      status: 'PENDING_REVIEW' as const,
      rejectionReason: null,
      submittedAt: new Date(),
      reviewedAt: null,
    }
    if (existing) await prisma.kycSubmission.update({ where: { userId: user.id }, data: record })
    else await prisma.kycSubmission.create({ data: { userId: user.id, ...record } })
    await prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'PENDING_REVIEW' } })

    const message = [
      '*🛡️ New KYC Submission*',
      `*User:* ${esc(user.name || 'Unknown')}`,
      `*Email:* ${esc(user.email || '')}`,
      `*Full Name:* ${esc(fullName)}`,
      `*DOB:* ${esc(dob)}`,
      `*Country:* ${esc(country)}`,
      `*Document Type:* ${esc(docType)}`,
      `*Front:* [Open image](${documentFrontUrl})`,
      `*Back:* [Open image](${documentBackUrl})`,
      `*Selfie:* [Open image](${selfieUrl})`,
    ].join('\n')

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
      })
    }

    try { await trigger(adminChannel, 'admin:kyc_submitted', { userId: user.id, name: user.name, email: user.email }) } catch {}
    try { await notifyUser(prisma, user.id, 'KYC Submitted', 'Your documents are under review.', '/kyc') } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to submit KYC' }, { status: 500 })
  }
}
