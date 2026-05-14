import { jwtVerify } from 'jose'

const SECRET     = process.env.PUBLIC_AUTH_SECRET ?? ''
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')

async function base64urlSha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(Array.from(new Uint8Array(hash), b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function POST(req: Request) {
  const ct = req.headers.get('content-type') ?? ''
  let params: URLSearchParams

  if (ct.includes('application/x-www-form-urlencoded')) {
    params = new URLSearchParams(await req.text())
  } else {
    const body = await req.json().catch(() => ({})) as Record<string, string>
    params = new URLSearchParams(body)
  }

  const grantType = params.get('grant_type')

  // ── Authorization Code + PKCE ──────────────────────────────────────────────
  if (grantType === 'authorization_code') {
    const code         = params.get('code') ?? ''
    const codeVerifier = params.get('code_verifier') ?? ''

    let payload: Record<string, unknown>
    try {
      const result = await jwtVerify(code, JWT_SECRET)
      payload = result.payload as Record<string, unknown>
    } catch {
      return Response.json({ error: 'invalid_grant', error_description: 'code expired or invalid' }, { status: 400 })
    }

    // Verify PKCE S256 challenge
    if (payload.code_challenge_method === 'S256') {
      const computed = await base64urlSha256(codeVerifier)
      if (computed !== payload.code_challenge) {
        return Response.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 })
      }
    }

    return Response.json({
      access_token: SECRET,
      token_type:   'bearer',
      expires_in:   31536000,
      scope:        'mcp',
    })
  }

  // ── Client Credentials ─────────────────────────────────────────────────────
  if (grantType === 'client_credentials' || !grantType) {
    const clientSecret = params.get('client_secret')
    if (!SECRET || clientSecret !== SECRET) {
      return Response.json({ error: 'invalid_client' }, { status: 401 })
    }
    return Response.json({
      access_token: SECRET,
      token_type:   'bearer',
      expires_in:   31536000,
      scope:        'mcp',
    })
  }

  return Response.json({ error: 'unsupported_grant_type' }, { status: 400 })
}
