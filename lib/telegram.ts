const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''

function telegramApiUrl(method: string) {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`
}

export function hasTelegramKycConfig() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}

export async function sendTelegramMessage(text: string) {
  if (!hasTelegramKycConfig()) return { ok: false, skipped: true }
  const res = await fetch(telegramApiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return { ok: res.ok, skipped: false, data: await res.json().catch(() => null) }
}

export async function sendTelegramDocument(file: File, caption: string) {
  if (!hasTelegramKycConfig()) return { ok: false, skipped: true }
  const form = new FormData()
  form.append('chat_id', TELEGRAM_CHAT_ID)
  form.append('caption', caption)
  form.append('parse_mode', 'HTML')
  form.append('document', file, file.name)
  const res = await fetch(telegramApiUrl('sendDocument'), { method: 'POST', body: form })
  return { ok: res.ok, skipped: false, data: await res.json().catch(() => null) }
}
