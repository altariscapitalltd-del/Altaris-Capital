import PushNotifications from '@pusher/push-notifications-server'
import webpush from 'web-push'
import { trigger, userChannel } from './pusher'
import { sendNotificationEmail } from './email'

const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID || ''
const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY || ''

const beamsClient =
  instanceId && secretKey
    ? new PushNotifications({ instanceId, secretKey })
    : null

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${process.env.GMAIL_USER || 'no-reply@altaris.local'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

type Prefs = {
  pushAlerts?: boolean
  emailUpdates?: boolean
  investmentAlerts?: boolean
}

function extractStored(subscriptionBlob: any): { subscription?: any; preferences: Prefs } {
  if (!subscriptionBlob || typeof subscriptionBlob !== 'object') {
    return { preferences: {} }
  }
  const hasEndpoint = typeof subscriptionBlob.endpoint === 'string'
  if (hasEndpoint) {
    return { subscription: subscriptionBlob, preferences: {} }
  }
  return {
    subscription: subscriptionBlob.subscription,
    preferences: subscriptionBlob.preferences || {},
  }
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string },
  subscription?: any,
) {
  const deepLink = payload.url
    ? (payload.url.startsWith('http') ? payload.url : `${process.env.NEXT_PUBLIC_APP_URL || ''}${payload.url}`).trim()
    : undefined

  if (subscription && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: deepLink,
      }),
    )
    return
  }

  if (!beamsClient) return
  const interest = `user-${userId}`
  await beamsClient.publishToInterests([interest], {
    web: {
      notification: {
        title: payload.title,
        body: payload.body,
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
  category: 'general' | 'investment' = 'general',
) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, pushSubscription: true } })
  const { subscription, preferences } = extractStored(target?.pushSubscription)

  const wantsInvest = preferences.investmentAlerts !== false
  if (category === 'investment' && !wantsInvest) return

  await prisma.notification.create({
    data: { userId, title, body, url },
  })

  const wantsEmail = preferences.emailUpdates !== false
  if (wantsEmail && target?.email) {
    try {
      await sendNotificationEmail(target.email, target.name || 'User', title, body)
    } catch {
      // keep notification flow resilient if email fails
    }
  }

  const wantsPush = preferences.pushAlerts !== false
  if (wantsPush) {
    try {
      await sendPushNotification(userId, { title, body, url }, subscription)
    } catch {
      // no-op, in-app delivery continues below
    }
  }

  await trigger(userChannel(userId), 'notification:new', { title, body, url })
}
