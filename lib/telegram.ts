import { readFile } from 'fs/promises'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

function canSendTelegram() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}

function telegramApiUrl(method: string) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`
}

export async function sendTelegramMessage(text: string) {
  if (!canSendTelegram()) return false
  const res = await fetch(telegramApiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return res.ok
}

export async function sendTelegramFile(filePath: string, filename: string, caption: string, type: 'document' | 'photo' = 'document') {
  if (!canSendTelegram()) return false
  const bytes = await readFile(filePath)
  const form = new FormData()
  form.append('chat_id', TELEGRAM_CHAT_ID as string)
  form.append('caption', caption)
  form.append(type, new File([bytes], filename))
  const method = type === 'photo' ? 'sendPhoto' : 'sendDocument'
  const res = await fetch(telegramApiUrl(method), { method: 'POST', body: form })
  return res.ok
}
