export async function sendTelegramDocument(params: { filename: string, contentType: string, buffer: Buffer, caption: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return { sent: false, reason: 'Missing Telegram credentials' }

  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('caption', params.caption)
  form.append('document', new Blob([new Uint8Array(params.buffer)], { type: params.contentType || 'application/octet-stream' }), params.filename)

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form })
  return { sent: res.ok, reason: res.ok ? undefined : await res.text() }
}

export async function sendTelegramPhoto(params: { filename: string, contentType: string, buffer: Buffer, caption: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return { sent: false, reason: 'Missing Telegram credentials' }

  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('caption', params.caption)
  form.append('photo', new Blob([new Uint8Array(params.buffer)], { type: params.contentType || 'image/jpeg' }), params.filename)

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form })
  return { sent: res.ok, reason: res.ok ? undefined : await res.text() }
}
