const TELEGRAM_API = 'https://api.telegram.org'

function getAdminTelegramConfig() {
  const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId) return null
  return { token, chatId }
}

export async function sendAdminTelegramMessage(text: string) {
  const cfg = getAdminTelegramConfig()
  if (!cfg) return { skipped: true }

  const body = new FormData()
  body.set('chat_id', cfg.chatId)
  body.set('text', text)
  body.set('parse_mode', 'HTML')
  body.set('disable_web_page_preview', 'true')

  const res = await fetch(`${TELEGRAM_API}/bot${cfg.token}/sendMessage`, {
    method: 'POST',
    body,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Admin Telegram sendMessage failed: ${res.status} ${err}`)
  }

  return res.json().catch(() => ({ ok: true }))
}

export function isAdminTelegramConfigured() {
  return Boolean(getAdminTelegramConfig())
}

