import { ALCHEMY_AUTH_TOKEN, ALCHEMY_WEBHOOK_IDS } from '@/lib/config/deposits'

// Add a freshly-assigned deposit address to every configured Alchemy Address
// Activity webhook so the watcher starts monitoring it across all chains.
// Best-effort and non-blocking: if Alchemy isn't configured yet (scaffold mode)
// or a call fails, we swallow the error — address assignment must still succeed.
export async function registerDepositAddress(address: string): Promise<void> {
  if (!ALCHEMY_AUTH_TOKEN || ALCHEMY_WEBHOOK_IDS.length === 0) return

  await Promise.allSettled(
    ALCHEMY_WEBHOOK_IDS.map((webhookId) => addAddressToWebhook(webhookId, address)),
  )
}

async function addAddressToWebhook(webhookId: string, address: string): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://dashboard.alchemy.com/api/update-webhook-addresses', {
      method: 'PATCH',
      headers: {
        'X-Alchemy-Token': ALCHEMY_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_id: webhookId,
        addresses_to_add: [address],
        addresses_to_remove: [],
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`[alchemy] failed to register ${address} on webhook ${webhookId}: ${res.status}`)
    }
  } catch (err) {
    console.error(`[alchemy] error registering ${address} on webhook ${webhookId}`, err)
  } finally {
    clearTimeout(timer)
  }
}
