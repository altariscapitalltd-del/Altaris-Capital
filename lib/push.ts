import PushNotifications from '@pusher/push-notifications-server'
import { trigger, userChannel } from './pusher'
import { sendNotificationEmail } from './email'

const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID || ''
const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY || ''
const beamsClient =
  instanceId && secretKey
    ? new PushNotifications({ instanceId, secretKey })
    : null

type PreferenceSet = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
}

function userPreferences(raw: unknown): PreferenceSet {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : false,
    emailUpdates: typeof p.emailUpdates === 'boolean' ? p.emailUpdates : true,
    investmentAlerts: typeof p.investmentAlerts === 'boolean' ? p.investmentAlerts : true,
  }
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!beamsClient) return
  const interest = `user-${userId}`
  const deepLink = payload.url
    ? (payload.url.startsWith('http') ? payload.url : `${process.env.NEXT_PUBLIC_APP_URL || ''}${payload.url}`).trim()
    : undefined
  await beamsClient.publishToInterests([interest], {
    web: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192x192.png',
        ...(deepLink && { deep_link: deepLink }),
      },
    },
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

  if (beamsClient && prefs.pushAlerts && investmentAllowed) {
    try {
      await sendPushNotification(userId, { title, body, url })
    } catch {
      // do not fail request if push fails
    }
  }

  await trigger(userChannel(userId), 'notification:new', { title, body, url })
}
