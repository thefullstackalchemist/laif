import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getHealthModel, COLLECTION_NAME } from '@/lib/models/HealthRecord'

export async function GET() {
  try {
    await connectDB()

    const entries = await Promise.all(
      Object.keys(COLLECTION_NAME).map(async (type) => {
        const doc = await getHealthModel(type).findOne().sort({ recordedAt: -1 }).select('recordedAt').lean()
        const ts  = doc ? (doc as any).recordedAt?.getTime() ?? null : null
        return [type, ts]
      })
    )

    return NextResponse.json(Object.fromEntries(entries))
  } catch (err) {
    console.error('[health/status]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
