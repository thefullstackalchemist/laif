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
  '/api/posthook_listener',
  '/_next',
  '/favicon',
]

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
