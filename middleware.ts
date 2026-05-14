import { next } from '@vercel/functions'
import { readCookie, verifySessionToken, AUTH_COOKIE } from './auth/session'

export const config = {
  matcher: [
    '/',
    '/((?!api/login|api/logout|login\\.html|favicon\\.svg).+)',
  ],
}

export default async function middleware(request: Request): Promise<Response> {
  const secret = process.env.SITE_PASSWORD?.trim()
  if (!secret) {
    return next()
  }

  const url = new URL(request.url)
  const p = url.pathname

  if (
    p === '/login.html' ||
    p.startsWith('/api/login') ||
    p.startsWith('/api/logout') ||
    p === '/favicon.svg'
  ) {
    return next()
  }

  const raw = readCookie(request.headers.get('cookie'), AUTH_COOKIE)
  if (raw && (await verifySessionToken(secret, raw))) {
    return next()
  }

  return Response.redirect(new URL('/login.html', request.url), 302)
}
