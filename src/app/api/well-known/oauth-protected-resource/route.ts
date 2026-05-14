export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  return Response.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp'],
  })
}
