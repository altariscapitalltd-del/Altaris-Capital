import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, Messaging } from 'firebase/messaging'

let messagingPromise: Promise<Messaging | null> | null = null

function createFirebaseApp() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) return null

  const config = {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }

  if (!getApps().length) {
    return initializeApp(config)
  }
  return getApp()
}

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  if (messagingPromise) return messagingPromise

  messagingPromise = (async () => {
    const app = createFirebaseApp()
    if (!app) return null
    try {
      return getMessaging(app)
    } catch {
      return null
    }
  })()

  return messagingPromise
}

export async function getFirebaseMessagingToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })
    return token || null
  } catch {
    return null
  }
}

