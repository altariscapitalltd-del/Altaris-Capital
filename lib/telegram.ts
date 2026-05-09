type TelegramFile = {
  field: 'document' | 'photo'
  file: File
  caption?: string
}

const TELEGRAM_API = 'https://api.telegram.org'

function getKycTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.KYC_TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_KYC_CHAT_ID || process.env.KYC_TELEGRAM_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

async function callTelegram(method: string, body: FormData) {
  const cfg = getKycTelegramConfig()
  if (!cfg) return { skipped: true }

  body.set('chat_id', cfg.chatId)
  const res = await fetch(`${TELEGRAM_API}/bot${cfg.token}/${method}`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Telegram ${method} failed: ${res.status} ${text}`)
  }

  return res.json().catch(() => ({ ok: true }))
}

export async function sendTelegramMessage(text: string) {
  const body = new FormData()
  body.set('text', text)
  body.set('parse_mode', 'HTML')
  body.set('disable_web_page_preview', 'true')
  return callTelegram('sendMessage', body)
}

export async function sendTelegramFile({ field, file, caption }: TelegramFile) {
  const body = new FormData()
  if (caption) body.set('caption', caption)
  const bytes = Buffer.from(await file.arrayBuffer())
  body.set(field, new Blob([bytes], { type: file.type || 'application/octet-stream' }), file.name || `kyc-${Date.now()}`)
  return callTelegram(field === 'photo' ? 'sendPhoto' : 'sendDocument', body)
}

export function isTelegramKycConfigured() {
  return Boolean(getKycTelegramConfig())
}
