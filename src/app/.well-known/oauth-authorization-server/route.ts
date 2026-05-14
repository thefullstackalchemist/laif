export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  return Response.json({
    issuer: origin,
    token_endpoint: `${origin}/api/auth/token`,
    grant_types_supported: ['client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    scopes_supported: ['mcp'],
  })
}
