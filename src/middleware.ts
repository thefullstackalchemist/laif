import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { COOKIE_NAME } from '@/lib/auth'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

/** Paths that don't require authentication */
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/token',
  '/api/posthook_listener',
  '/api/devices/register',
  '/api/health/ingest',
  '/api/health/status',
  '/.well-known',
  '/_next',
  '/favicon',
]

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  // Machine auth — MCP server and other programmatic callers
  const apiKey = request.headers.get('x-api-key')
  if (apiKey && apiKey === process.env.PUBLIC_AUTH_SECRET) {
    return NextResponse.next()
  }

  // OAuth Bearer token (Claude Desktop remote MCP)
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ') && auth.slice(7) === process.env.PUBLIC_AUTH_SECRET) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const res = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(COOKIE_NAME)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.webp).*)'],
}
