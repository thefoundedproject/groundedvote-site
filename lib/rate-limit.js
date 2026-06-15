/**
 * In-memory sliding window rate limiter.
 * No Redis required — state resets on deploy, which is fine for initial launch.
 * For production scale, swap Map for Upstash Redis.
 */

// Map<ip_route_key, number[]>  (array of timestamps)
const store = new Map()

/**
 * @param {string} key        - unique key per rule, e.g. "geocode:1.2.3.4"
 * @param {number} limit      - max requests allowed in window
 * @param {number} windowSecs - rolling window in seconds
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(key, limit = 20, windowSecs = 60) {
  const now = Date.now()
  const windowMs = windowSecs * 1000
  const cutoff = now - windowMs

  const timestamps = (store.get(key) ?? []).filter(t => t > cutoff)
  timestamps.push(now)
  store.set(key, timestamps)

  const count = timestamps.length
  const allowed = count <= limit
  const oldest = timestamps[0] ?? now
  const resetIn = Math.ceil((oldest + windowMs - now) / 1000)

  // Prune the store periodically to avoid memory growth
  if (store.size > 10_000) {
    for (const [k, ts] of store.entries()) {
      if (ts.every(t => t <= cutoff)) store.delete(k)
    }
  }

  return { allowed, remaining: Math.max(0, limit - count), resetIn }
}

/**
 * Get IP from Next.js request headers (works on Railway/Vercel).
 */
export function getClientIP(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

/**
 * Helper: returns a 429 Response if rate-limited, or null if allowed.
 * Usage: const limited = applyRateLimit(req, 'geocode', 30, 60)
 *        if (limited) return limited
 */
export function applyRateLimit(req, route, limit = 20, windowSecs = 60) {
  const ip = getClientIP(req)
  const key = `${route}:${ip}`
  const { allowed, remaining, resetIn } = checkRateLimit(key, limit, windowSecs)

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait before trying again.', resetIn }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(resetIn),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + resetIn * 1000) / 1000)),
        },
      }
    )
  }
  return null
}
