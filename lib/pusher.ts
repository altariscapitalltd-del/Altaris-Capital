import Pusher from 'pusher'

const appId = process.env.PUSHER_APP_ID || ''
const key = process.env.PUSHER_KEY || ''
const secret = process.env.PUSHER_SECRET || ''
const cluster = process.env.PUSHER_CLUSTER || ''

export const pusher = new Pusher({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
})

export function userChannel(userId: string) {
  return `private-user-${userId}`
}

export const adminChannel = 'private-admin'

export async function trigger(channel: string, event: string, data: any) {
  if (!key || !secret || !appId || !cluster) {
    console.warn('[Pusher] missing credentials, skipping trigger', { channel, event })
    return
  }
  try {
    await pusher.trigger(channel, event, data)
  } catch (err) {
    console.error('[Pusher] trigger failed', err)
  }
}
