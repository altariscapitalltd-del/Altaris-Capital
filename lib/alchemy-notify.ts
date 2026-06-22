/**
 * Alchemy Notify — webhook address management.
 *
 * Registers/removes user EVM addresses with Alchemy Address Activity webhooks
 * so deposits are detected in real-time instead of via polling.
 *
 * Required env vars (set on Vercel):
 *   ALCHEMY_AUTH_TOKEN        — from Alchemy dashboard sidebar → "Auth Token"
 *   ALCHEMY_WEBHOOK_ETH_ID   — ETH_MAINNET webhook ID (create once in dashboard)
 *   ALCHEMY_WEBHOOK_BNB_ID   — BNB_MAINNET webhook ID (optional)
 */

const BASE = 'https://dashboard.alchemy.com/api'

async function alchemyNotifyRequest(path: string, method: string, body?: object) {
  const token = process.env.ALCHEMY_AUTH_TOKEN
  if (!token) return null
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: { 'X-Alchemy-Token': token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Alchemy Notify ${method} ${path} ${res.status}: ${text}`)
  }
  return res.json()
}

export async function addAddressesToWebhook(addresses: string[]): Promise<void> {
  if (!addresses.length) return
  const ethId = process.env.ALCHEMY_WEBHOOK_ETH_ID
  const bnbId = process.env.ALCHEMY_WEBHOOK_BNB_ID
  const updates: Promise<any>[] = []
  if (ethId) {
    updates.push(alchemyNotifyRequest('update-webhook-addresses', 'PATCH', {
      webhook_id: ethId,
      addresses_to_add: addresses,
      addresses_to_remove: [],
    }))
  }
  if (bnbId) {
    updates.push(alchemyNotifyRequest('update-webhook-addresses', 'PATCH', {
      webhook_id: bnbId,
      addresses_to_add: addresses,
      addresses_to_remove: [],
    }))
  }
  await Promise.all(updates)
}

export async function listWebhooks() {
  return alchemyNotifyRequest('team-webhooks', 'GET')
}
