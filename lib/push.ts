import { SignJWT, importPKCS8 } from 'jose'
import { trigger, userChannel } from './pusher'
import { sendNotificationEmail } from './email'

const FCM_SERVER_KEY = process.env.FIREBASE_SERVER_KEY || ''
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''

type PreferenceSet = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
}

type StoredSubscription = PreferenceSet & {
  token?: string | null
}

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id?: string
  token_uri?: string
}

type OAuthTokenCache = {
  token: string
  expiresAt: number
}

let oauthTokenCache: OAuthTokenCache | null = null

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

function parseServiceAccountFromEnv(): ServiceAccount | null {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) return null
  try {
    const parsed = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount
    if (!parsed.client_email || !parsed.private_key) return null
    return parsed
  } catch {
    return null
  }
}

async function getGoogleAccessToken(serviceAccount: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)
  if (oauthTokenCache && oauthTokenCache.expiresAt > now + 60) return oauthTokenCache.token

  try {
    const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token'
    const privateKey = serviceAccount.private_key.includes('\\n')
      ? serviceAccount.private_key.replace(/\\n/g, '\n')
      : serviceAccount.private_key

    const key = await importPKCS8(privateKey, 'RS256')
    const assertion = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(serviceAccount.client_email)
      .setSubject(serviceAccount.client_email)
      .setAudience(tokenUri)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key)

    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    })

    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    if (!res.ok) return null
    const json = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!json.access_token) return null

    oauthTokenCache = {
      token: json.access_token,
      expiresAt: now + Math.max(60, Number(json.expires_in || 3600) - 60),
    }

    return oauthTokenCache.token
  } catch {
    return null
  }
}

async function sendPushNotificationLegacy(token: string, payload: { title: string; body: string; url?: string }): Promise<boolean> {
  if (!FCM_SERVER_KEY || !token) return false

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

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(body),
  })

  return res.ok
}

async function sendPushNotificationV1(token: string, payload: { title: string; body: string; url?: string }): Promise<boolean> {
  const serviceAccount = parseServiceAccountFromEnv()
  if (!serviceAccount || !token) return false

  const projectId = serviceAccount.project_id || FIREBASE_PROJECT_ID
  if (!projectId) return false

  const accessToken = await getGoogleAccessToken(serviceAccount)
  if (!accessToken) return false

  const deepLink = payload.url
    ? (payload.url.startsWith('http') ? payload.url : `${process.env.NEXT_PUBLIC_APP_URL || ''}${payload.url}`).trim()
    : undefined

  const body = {
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        fcmOptions: deepLink ? { link: deepLink } : undefined,
        notification: {
          icon: '/icons/icon-192x192.png',
        },
      },
      data: {
        url: deepLink || payload.url || '/dashboard',
      },
    },
  }

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  return res.ok
}

export async function sendPushNotification(
  token: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    // Prefer FCM HTTP v1 (works when legacy API is disabled).
    const sent = await sendPushNotificationV1(token, payload)
    if (sent) return
  } catch {
    // fall through to legacy compatibility path
  }

  try {
    await sendPushNotificationLegacy(token, payload)
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
