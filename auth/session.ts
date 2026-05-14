/** Cookie 名（middleware / api で共通） */
export const AUTH_COOKIE = 'kpi_auth'

const PREFIX = 'v1'

function hexFromBuf(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return hexFromBuf(sig)
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** 有効期限付きトークン（HMAC）。秘密は SITE_PASSWORD（サーバー・Edge のみ）。 */
export async function createSessionToken(secret: string, ttlMs: number): Promise<string> {
  const exp = Date.now() + ttlMs
  const base = `${PREFIX}|${exp}`
  const mac = await hmacHex(secret, base)
  return `${PREFIX}.${exp}.${mac}`
}

export async function verifySessionToken(secret: string, token: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return false
  const exp = Number(parts[1])
  const mac = parts[2]
  if (!Number.isFinite(exp) || !/^[0-9a-f]+$/i.test(mac)) return false
  if (Date.now() > exp + 120_000) return false
  const base = `${PREFIX}|${exp}`
  const expected = await hmacHex(secret, base)
  return timingSafeEqualHex(mac.toLowerCase(), expected.toLowerCase())
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    if (k !== name) continue
    const v = part.slice(idx + 1).trim()
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }
  return undefined
}
