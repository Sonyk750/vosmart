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

// IP-ul REAL, nu cel pe care si-l scrie singur cel care bate la usa.
//
// `x-forwarded-for` e o lista la care fiecare intermediar adauga la coada, deci
// primul element e exact ce a trimis clientul: cine punea acolo o valoare noua la
// fiecare cerere primea de fiecare data un contor nou si trecea de orice limita.
// Pe Vercel exista `x-vercel-forwarded-for`, scris de platforma si nesuprascriptibil
// din afara; `x-real-ip` e echivalentul de la alte proxy-uri. Ultimul element din
// XFF (adaugat de proxy-ul cel mai apropiat) e mai de incredere decat primul, dar
// ramane doar plasa de siguranta pentru rulari locale.
export function clientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")
  if (vercel) return vercel.split(",")[0].trim()

  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()

  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const parts = xff.split(",").map(p => p.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return "unknown"
}
