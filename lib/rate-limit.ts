// In-memory sliding-window rate limiter. Pe serverless contorul e per-instanță
// (se resetează la cold start) — protecție de bază, nu distribuită.
type Hit = { count: number; resetAt: number }
const store = new Map<string, Hit>()
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const h = store.get(key)
  if (!h || now > h.resetAt) { store.set(key, { count: 1, resetAt: now + windowMs }); return { ok: true, retryAfter: 0 } }
  if (h.count >= limit) return { ok: false, retryAfter: Math.ceil((h.resetAt - now) / 1000) }
  h.count++; return { ok: true, retryAfter: 0 }
}
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  return (xff ? xff.split(",")[0].trim() : "") || "unknown"
}
