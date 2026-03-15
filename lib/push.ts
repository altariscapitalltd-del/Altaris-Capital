import PushNotifications from '@pusher/push-notifications-server'
import { trigger, userChannel } from './pusher'
import { sendNotificationEmail } from './email'

const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID || ''
const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY || ''

const beamsClient =
  instanceId && secretKey
    ? new PushNotifications({ instanceId, secretKey })
    : null

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
  url = '/dashboard'
) {
  await prisma.notification.create({
    data: { userId, title, body, url },
  })

  try {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    if (target?.email) {
      await sendNotificationEmail(target.email, target.name || 'User', title, body)
    }
  } catch {
    // keep notification flow resilient if email fails
  }

  if (beamsClient) {
    try {
      await sendPushNotification(userId, { title, body, url })
    } catch (e) {
      // Log but don't fail — in-app notification still works via Pusher
    }
  }

  await trigger(userChannel(userId), 'notification:new', { title, body, url })
}
