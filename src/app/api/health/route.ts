import { NextResponse } from 'next/server'
import { subDays } from 'date-fns'
import { connectDB } from '@/lib/mongodb'
import { getHealthModel } from '@/lib/models/HealthRecord'

const FETCH_CONFIG = [
  { key: 'heartRate',       type: 'heart_rate',          days: 7  },
  { key: 'steps',           type: 'steps',               days: 14 },
  { key: 'sleep',           type: 'sleep',               days: 14 },
  { key: 'calories',        type: 'total_calories',      days: 7  },
  { key: 'hrv',             type: 'hrv',                 days: 30 },
  { key: 'restingHR',       type: 'resting_heart_rate',  days: 30 },
  { key: 'spo2',            type: 'spo2',                days: 7  },
  { key: 'exercises',       type: 'exercise_session',    days: 30 },
  { key: 'weight',          type: 'weight',              days: 90 },
  { key: 'respiratoryRate', type: 'respiratory_rate',    days: 7  },
  { key: 'distance',        type: 'distance',            days: 7  },
]

export async function GET() {
  try {
    await connectDB()

    const entries = await Promise.all(
      FETCH_CONFIG.map(async ({ key, type, days }) => {
        const docs = await getHealthModel(type)
          .find({ recordedAt: { $gte: subDays(new Date(), days) } })
          .sort({ recordedAt: 1 })
          .lean()
        return [key, docs.map((d: any) => d.data)]
      })
    )

    return NextResponse.json(Object.fromEntries(entries))
  } catch (err) {
    console.error('[health]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
