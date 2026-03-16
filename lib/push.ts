import { trigger, userChannel } from './pusher'
import { sendNotificationEmail } from './email'

const FCM_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || ''

type PreferenceSet = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
}

type StoredSubscription = PreferenceSet & {
  token?: string | null
}

function parseStoredSubscription(raw: unknown): { prefs: PreferenceSet; token: string | null } {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const prefs: PreferenceSet = {
    pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : false,
    emailUpdates: typeof p.emailUpdates === 'boolean' ? p.emailUpdates : true,
    investmentAlerts: typeof p.investmentAlerts === 'boolean' ? p.investmentAlerts : true,
  }
  const token = typeof p.token === 'string' ? p.token : null
  return { prefs, token }
}

export async function sendPushNotification(
  token: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!FCM_SERVER_KEY || !token) return
  const deepLink = payload.url
    ? (payload.url.startsWith('http') ? payload.url : `${process.env.NEXT_PUBLIC_APP_URL || ''}${payload.url}`).trim()
    : undefined
  const body = {
    to: token,
    notification: {
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      ...(deepLink && { click_action: deepLink }),
    },
    data: {
      url: deepLink || payload.url || '/dashboard',
    },
  }

  try {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // ignore network errors to keep request path resilient
  }
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
  const { prefs, token } = parseStoredSubscription(target?.pushSubscription)
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

  if (prefs.pushAlerts && investmentAllowed && token) {
    try {
      await sendPushNotification(token, { title, body, url })
    } catch {
      // do not fail request if push fails
    }
  }

  await trigger(userChannel(userId), 'notification:new', { title, body, url })
}
