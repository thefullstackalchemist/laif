import { NextResponse } from 'next/server'
import { startOfDay, subDays } from 'date-fns'
import { connectDB } from '@/lib/mongodb'
import { getHealthModel } from '@/lib/models/HealthRecord'

export async function GET() {
  try {
    await connectDB()

    const todayStart     = startOfDay(new Date())
    const yesterdayStart = startOfDay(subDays(new Date(), 1))
    const week           = subDays(new Date(), 7)

    const [heartRates, steps, sleep, calories, hrv, restingHR, spo2] = await Promise.all([
      getHealthModel('heart_rate').findOne({ recordedAt: { $gte: todayStart } }).sort({ recordedAt: -1 }).lean(),
      getHealthModel('steps').find({ recordedAt: { $gte: todayStart } }).lean(),
      getHealthModel('sleep').findOne({ recordedAt: { $gte: yesterdayStart } }).sort({ recordedAt: -1 }).lean(),
      getHealthModel('total_calories').find({ recordedAt: { $gte: todayStart } }).lean(),
      getHealthModel('hrv').findOne({ recordedAt: { $gte: week } }).sort({ recordedAt: -1 }).lean(),
      getHealthModel('resting_heart_rate').findOne({ recordedAt: { $gte: week } }).sort({ recordedAt: -1 }).lean(),
      getHealthModel('spo2').findOne({ recordedAt: { $gte: todayStart } }).sort({ recordedAt: -1 }).lean(),
    ])

    const latestHR      = (heartRates as any)?.data?.beatsPerMinute ?? null
    const totalSteps    = (steps as any[]).reduce((s, r) => s + (r.data?.count ?? 0), 0)
    const lastSleep     = (sleep as any)?.data ?? null
    const totalCalories = Math.round((calories as any[]).reduce((s, r) => s + (r.data?.calories ?? 0), 0))
    const latestHRV     = (hrv as any)?.data?.rmssd     != null ? Math.round((hrv as any).data.rmssd)        : null
    const latestRHR     = (restingHR as any)?.data?.beatsPerMinute ?? null
    const latestSpO2    = (spo2 as any)?.data?.percentage != null ? +((spo2 as any).data.percentage).toFixed(1) : null

    return NextResponse.json({
      heartRate:  latestHR,
      steps:      totalSteps,
      sleep:      lastSleep ? { durationMinutes: lastSleep.durationMinutes } : null,
      calories:   totalCalories,
      hrv:        latestHRV,
      restingHR:  latestRHR,
      spo2:       latestSpO2,
    })
  } catch (err) {
    console.error('[health/today]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
