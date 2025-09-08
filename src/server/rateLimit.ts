type Key = string
type Bucket = { tokens: number; last: number }
const BUCKETS: Map<Key, Bucket> = new Map()

export function rateLimit({ key, limit = 30, windowMs = 60_000 }: { key: string; limit?: number; windowMs?: number }) {
  const now = Date.now()
  let b = BUCKETS.get(key)
  if (!b) { b = { tokens: limit, last: now }; BUCKETS.set(key, b) }
  const elapsed = now - b.last
  if (elapsed > windowMs) { b.tokens = limit; b.last = now }
  if (b.tokens <= 0) return false
  b.tokens -= 1
  return true
}

export function extractClientKey(req: Request): string {
  try {
    // Next.js runtime has headers() but Request also carries forwarded headers
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '')
      .split(',')[0]
      .trim()
    const ua = req.headers.get('user-agent') || ''
    return `${ip}|${ua}`
  } catch {
    return 'unknown'
  }
}

