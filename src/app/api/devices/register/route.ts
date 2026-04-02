import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import DeviceModel from '@/lib/models/Device'

export async function POST(req: Request) {
  const { fcmToken, platform = 'android' } = await req.json().catch(() => ({}))

  if (!fcmToken || typeof fcmToken !== 'string') {
    return NextResponse.json({ error: 'fcmToken required' }, { status: 400 })
  }

  await connectDB()

  // Upsert — update timestamp if token already exists
  await DeviceModel.findOneAndUpdate(
    { fcmToken },
    { fcmToken, platform, updatedAt: new Date() },
    { upsert: true, new: true }
  )

  return NextResponse.json({ ok: true })
}
