import { buildClearAuthCookie } from '../auth/cookie'

export const config = {
  runtime: 'edge',
}

export default function handler(request: Request): Response {
  const secret = process.env.SITE_PASSWORD?.trim()
  if (!secret) {
    return Response.redirect(new URL('/', request.url).toString(), 302)
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL('/login.html', request.url).toString(),
      'Set-Cookie': buildClearAuthCookie(request.url),
    },
  })
}
