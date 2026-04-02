import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import UserModel from '@/lib/models/User'
import { signToken, COOKIE_NAME } from '@/lib/auth'

type LeanUser = { _id: unknown; username: string; passwordHash: string }

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  console.log('[login] body received:', JSON.stringify({ ...body, password: body?.password ? '***' : undefined }))

  // Accept both "username" and "email" fields (mobile sends "email")
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase()
                 : typeof body?.email    === 'string' ? body.email.trim().toLowerCase()
                 : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  console.log('[login] resolved username:', username, '| password provided:', !!password)

  if (!username || !password) {
    console.log('[login] 400 — missing username or password')
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  await connectDB()
  const user = await UserModel.findOne({ username }).lean() as LeanUser | null

  if (!user) {
    // Constant-time response to prevent username enumeration
    await compare('dummy', '$2a$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.')
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signToken({ userId: String(user._id), username: user.username })

  const res = NextResponse.json({ ok: true, username: user.username })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  })
  return res
}
