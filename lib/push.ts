import { trigger, userChannel } from './pusher'
import { sendNotificationEmail } from './email'

type PreferenceSet = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
  oneSignalPlayerId?: string | null
  oneSignalSubscriptionId?: string | null
}

function userPreferences(raw: unknown): PreferenceSet {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : false,
    emailUpdates: typeof p.emailUpdates === 'boolean' ? p.emailUpdates : true,
    investmentAlerts: typeof p.investmentAlerts === 'boolean' ? p.investmentAlerts : true,
    oneSignalPlayerId: typeof p.oneSignalPlayerId === 'string' ? p.oneSignalPlayerId : null,
    oneSignalSubscriptionId: typeof p.oneSignalSubscriptionId === 'string' ? p.oneSignalSubscriptionId : null,
  }
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const appId = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !apiKey) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const targetUrl = payload.url
    ? (payload.url.startsWith('http') ? payload.url : `${appUrl}${payload.url}`)
    : appUrl

  await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      include_external_user_ids: [userId],
      target_channel: 'push',
      headings: { en: payload.title },
      contents: { en: payload.body },
      ...(targetUrl ? { url: targetUrl } : {}),
      web_push_topic: `altaris-${userId}`,
    }),
  })
}

export async function notifyUser(
  prisma: any,
  userId: string,
  title: string,
  body: string,
  url = '/dashboard',
  category: 'general' | 'investment' = 'general'
) {
  await prisma.notification.create({
    data: { userId, title, body, url },
  })

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, pushSubscription: true } })
  const prefs = userPreferences(target?.pushSubscription)
  const investmentAllowed = category !== 'investment' || prefs.investmentAlerts

  if (prefs.emailUpdates && investmentAllowed) {
    try {
      if (target?.email) {
        await sendNotificationEmail(target.email, target.name || 'User', title, body)
      }
    } catch {
      // keep notification flow resilient if email fails
    }
  }

  if (prefs.pushAlerts && investmentAllowed) {
    try {
      await sendPushNotification(userId, { title, body, url })
    } catch {
      // do not fail request if push fails
    }
  }

  await trigger(userChannel(userId), 'notification:new', { title, body, url })
}
