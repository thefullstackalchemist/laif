import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env variable is not set')
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

const COOKIE_NAME = 'laif_token'
const TOKEN_EXPIRY = '24h'

export interface TokenPayload extends JWTPayload {
  userId: string
  username: string
}

export async function signToken(payload: { userId: string; username: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, SECRET)
  return payload as TokenPayload
}

export { COOKIE_NAME }
