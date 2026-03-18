const TELEGRAM_API = 'https://api.telegram.org'

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) return null
  return { botToken, chatId }
}

async function telegramRequest(method: string, body: BodyInit) {
  const config = getTelegramConfig()
  if (!config) return { ok: false, skipped: true as const }

  const res = await fetch(`${TELEGRAM_API}/bot${config.botToken}/${method}`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Telegram ${method} failed: ${text}`)
  }

  return { ok: true as const, skipped: false as const }
}

export async function sendTelegramMessage(text: string) {
  const config = getTelegramConfig()
  if (!config) return { ok: false, skipped: true as const }

  const form = new FormData()
  form.append('chat_id', config.chatId)
  form.append('text', text)
  form.append('parse_mode', 'HTML')
  return telegramRequest('sendMessage', form)
}

export async function sendTelegramFile(params: {
  file: File
  caption: string
  kind: 'document' | 'photo'
  filename?: string
}) {
  const config = getTelegramConfig()
  if (!config) return { ok: false, skipped: true as const }

  const form = new FormData()
  form.append('chat_id', config.chatId)
  form.append('caption', params.caption)
  form.append('parse_mode', 'HTML')
  form.append(params.kind === 'photo' ? 'photo' : 'document', params.file, params.filename || params.file.name || 'upload')

  return telegramRequest(params.kind === 'photo' ? 'sendPhoto' : 'sendDocument', form)
}
