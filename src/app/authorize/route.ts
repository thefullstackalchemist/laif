import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { COOKIE_NAME } from '@/lib/auth'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

const ALLOWED_REDIRECT_HOSTS = ['claude.ai']

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const redirectUri        = p.get('redirect_uri') ?? ''
  const codeChallenge      = p.get('code_challenge') ?? ''
  const codeChallengeMethod = p.get('code_challenge_method') ?? 'S256'
  const state              = p.get('state') ?? ''
  const clientId           = p.get('client_id') ?? ''
  const scope              = p.get('scope') ?? ''
  const resource           = p.get('resource') ?? ''

  // Safety: only redirect to known hosts
  try {
    const host = new URL(redirectUri).hostname
    if (!ALLOWED_REDIRECT_HOSTS.includes(host)) {
      return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }

  // Verify user is logged in with JWT cookie
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    // Send them to login; they'll need to come back to Claude Desktop after
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', req.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    await jwtVerify(token, JWT_SECRET)
  } catch {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Auto-approve: issue an authorization code as a short-lived signed JWT
  const code = await new SignJWT({
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    redirect_uri: redirectUri,
    client_id: clientId,
    scope,
    resource,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(JWT_SECRET)

  const callbackUrl = new URL(redirectUri)
  callbackUrl.searchParams.set('code', code)
  if (state) callbackUrl.searchParams.set('state', state)

  return NextResponse.redirect(callbackUrl.toString())
}
