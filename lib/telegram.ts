const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

async function sendTelegram(method: string, body: FormData | URLSearchParams) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    body,
  })
  return res.ok
}

export async function sendTelegramText(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false
  const body = new URLSearchParams({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
  return sendTelegram('sendMessage', body)
}

export async function sendTelegramFile(kind: 'document' | 'photo', file: File, caption: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false
  const body = new FormData()
  body.append('chat_id', TELEGRAM_CHAT_ID)
  body.append('caption', caption)
  body.append(kind, file, file.name)
  return sendTelegram(kind === 'photo' ? 'sendPhoto' : 'sendDocument', body)
}

export function telegramEnabled() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}
