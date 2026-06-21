import { NextRequest } from 'next/server'

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Per-instance: on serverless (Vercel) each warm instance keeps its own counters,
 * so this raises the cost of brute-force/abuse without new infrastructure. For
 * strict global limits across all instances, swap the `store` for Upstash Redis
 * (`@upstash/ratelimit`) — the call sites below stay identical.
 */

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()
let lastSweep = 0

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  const expired: string[] = []
  store.forEach((b, k) => { if (b.resetAt <= now) expired.push(k) })
  expired.forEach(k => store.delete(k))
}

export type RateResult = { ok: boolean; remaining: number; retryAfter: number }

/** Allow up to `max` hits per `windowMs` for `key`. */
export function rateLimit(key: string, max: number, windowMs: number): RateResult {
  const now = Date.now()
  sweep(now)
  const b = store.get(key)
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1, retryAfter: 0 }
  }
  b.count++
  if (b.count > max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { ok: true, remaining: Math.max(0, max - b.count), retryAfter: 0 }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const first = xff.split(',')[0].trim()
  return first || req.headers.get('x-real-ip') || 'unknown'
}

/** Standard 429 response init with a Retry-After header. */
export function tooManyHeaders(retryAfter: number): HeadersInit {
  return { 'Retry-After': String(Math.max(1, retryAfter)) }
}
