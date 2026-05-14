const SECRET = process.env.PUBLIC_AUTH_SECRET ?? ''

export async function POST(req: Request) {
  let clientSecret: string | null = null

  const ct = req.headers.get('content-type') ?? ''
  if (ct.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    const params = new URLSearchParams(text)
    clientSecret = params.get('client_secret')
  } else {
    const body = await req.json().catch(() => ({}))
    clientSecret = body.client_secret ?? null
  }

  if (!SECRET || clientSecret !== SECRET) {
    return Response.json({ error: 'invalid_client' }, { status: 401 })
  }

  // The secret itself is the access token — middleware already validates it
  return Response.json({
    access_token: SECRET,
    token_type: 'bearer',
    expires_in: 31536000,
    scope: 'mcp',
  })
}
