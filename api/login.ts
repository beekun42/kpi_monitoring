import { createSessionToken } from '../auth/session'
import { buildSetAuthCookie } from '../auth/cookie'

const WEEK_SEC = 60 * 60 * 24 * 7
const WEEK_MS = WEEK_SEC * 1000

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'POST, OPTIONS',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const secret = process.env.SITE_PASSWORD?.trim()
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'disabled' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const password =
    typeof body === 'object' && body !== null && 'password' in body
      ? String((body as { password: unknown }).password ?? '')
      : ''

  if (password !== secret) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = await createSessionToken(secret, WEEK_MS)
  const cookie = buildSetAuthCookie(token, request.url, WEEK_SEC)

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  })
}
