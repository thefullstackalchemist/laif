import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import UserPreferences from '@/lib/models/UserPreferences'

// GET /api/preferences?key=rss
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  await connectDB()
  const doc = await UserPreferences.findOne({ key }).lean() as { value: unknown } | null
  return NextResponse.json({ value: doc?.value ?? null })
}

// PUT /api/preferences  { key, value }
export async function PUT(req: Request) {
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })

  await connectDB()
  const doc = await UserPreferences.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true }
  ).lean()
  return NextResponse.json({ ok: true, value: (doc as any).value })
}
