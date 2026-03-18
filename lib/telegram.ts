import fs from 'fs/promises'
import path from 'path'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

function enabled() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}

export async function sendKycToTelegram(payload: {
  user: { id: string; name: string; email: string }
  fullName: string
  dateOfBirth: string
  country: string
  address: string
  documentType?: string
  documentNumber?: string
  documentPath: string
  selfiePath?: string | null
}) {
  if (!enabled()) return { delivered: false, reason: 'telegram_not_configured' }

  const caption = [
    '📄 New KYC submission',
    `User: ${payload.user.name} (${payload.user.email})`,
    `User ID: ${payload.user.id}`,
    `Full name: ${payload.fullName}`,
    `DOB: ${payload.dateOfBirth}`,
    `Country: ${payload.country}`,
    `Address: ${payload.address}`,
    payload.documentType ? `Document type: ${payload.documentType}` : null,
    payload.documentNumber ? `Document number: ${payload.documentNumber}` : null,
  ].filter(Boolean).join('\n')

  const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  const sendText = await fetch(`${baseUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: caption }),
  })
  if (!sendText.ok) throw new Error('Failed to send KYC summary to Telegram')

  const sendFile = async (endpoint: 'sendDocument' | 'sendPhoto', filePath: string, fieldName: 'document' | 'photo', extraCaption?: string) => {
    const absolute = path.join(process.cwd(), 'uploads', 'kyc', filePath)
    const file = await fs.readFile(absolute)
    const form = new FormData()
    form.append('chat_id', TELEGRAM_CHAT_ID)
    if (extraCaption) form.append('caption', extraCaption)
    form.append(fieldName, new Blob([file]), path.basename(filePath))
    const res = await fetch(`${baseUrl}/${endpoint}`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`Failed to send ${filePath} to Telegram`)
  }

  await sendFile(payload.documentPath.toLowerCase().endsWith('.pdf') ? 'sendDocument' : 'sendPhoto', payload.documentPath, payload.documentPath.toLowerCase().endsWith('.pdf') ? 'document' : 'photo', 'KYC document')
  if (payload.selfiePath) {
    await sendFile('sendPhoto', payload.selfiePath, 'photo', 'KYC selfie')
  }

  return { delivered: true }
}
