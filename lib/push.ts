import webpush from 'web-push'
import { trigger, userChannel } from './pusher'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:altariscapital.ltd@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string }
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — caller should delete it
      throw new Error('SUBSCRIPTION_EXPIRED')
    }
  }
}

export async function notifyUser(prisma: any, userId: string, title: string, body: string, url = '/dashboard') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscription: true },
  })

  // Save to DB
  await prisma.notification.create({
    data: { userId, title, body, url },
  })

  // Send push
  if (user?.pushSubscription) {
    try {
      await sendPushNotification(user.pushSubscription as any, { title, body, url })
    } catch (e: any) {
      if (e.message === 'SUBSCRIPTION_EXPIRED') {
        await prisma.user.update({ where: { id: userId }, data: { pushSubscription: null } })
      }
    }
  }

  // Emit via Pusher
  await trigger(userChannel(userId), 'notification:new', { title, body, url })
}
