import { AUTH_COOKIE } from './session'

function secureFlag(requestUrl: string): boolean {
  return new URL(requestUrl).protocol === 'https:'
}

export function buildSetAuthCookie(token: string, requestUrl: string, maxAgeSec: number): string {
  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secureFlag(requestUrl)) parts.push('Secure')
  return parts.join('; ')
}

export function buildClearAuthCookie(requestUrl: string): string {
  const parts = [
    `${AUTH_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secureFlag(requestUrl)) parts.push('Secure')
  return parts.join('; ')
}
