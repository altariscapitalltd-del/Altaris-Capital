import { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

// In-memory sliding-window limiter. Per-instance only — acceptable for the
// single custom Node server this app runs on; swap for Redis if scaled out.
const buckets = new Map<string, Bucket>()

const MAX_BUCKETS = 10_000

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  Array.from(buckets.entries()).forEach(([key, bucket]) => {
    if (bucket.resetAt <= now) buckets.delete(key)
  })
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Window resets `windowMs` after the first hit.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  bucket.count += 1
  return bucket.count <= limit
}
