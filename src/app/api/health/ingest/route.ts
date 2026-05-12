import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { getHealthModel, COLLECTION_NAME } from '@/lib/models/HealthRecord'

// In-memory rate limiter for failed auth attempts (per IP)
const failedAttempts = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS  = 60_000
const MAX_FAILED = 10

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = failedAttempts.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  return entry.count > MAX_FAILED
}

const TIME_FIELD: Record<string, string> = {
  heart_rate: 'time', hrv: 'time', spo2: 'time', respiratory_rate: 'time',
  resting_heart_rate: 'time', speed: 'time', power: 'time', vo2_max: 'time',
  blood_pressure: 'time', blood_glucose: 'time', body_temperature: 'time',
  basal_body_temperature: 'time', weight: 'time', height: 'time',
  body_fat: 'time', lean_body_mass: 'time', bone_mass: 'time',
  basal_metabolic_rate: 'time', body_water_mass: 'time',
  menstruation_flow: 'time', cervical_mucus: 'time', ovulation_test: 'time',
  sexual_activity: 'time', intermenstrual_bleeding: 'time',
}

async function upsertBatch(type: string, records: Record<string, unknown>[]): Promise<number> {
  if (!records?.length) return 0
  const timeField = TIME_FIELD[type] ?? 'startTime'
  const model = getHealthModel(type)

  const ops = records.map(r => {
    const sourceId  = (r.sourceId as string | undefined) ?? `${type}:${r[timeField]}`
    const recordedAt = new Date(r[timeField] as string)
    return {
      updateOne: {
        filter:  { sourceId },
        update:  { $set: { sourceId, data: r, recordedAt, syncedAt: new Date() } },
        upsert:  true,
      },
    }
  })

  const result = await model.bulkWrite(ops, { ordered: false })
  return result.upsertedCount + result.modifiedCount
}

export async function POST(req: NextRequest) {
  const ip     = getIp(req)
  const secret = req.headers.get('x-health-secret')

  if (secret !== process.env.PUBLIC_AUTH_SECRET) {
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    await connectDB()

    if (body.reset === true) {
      await Promise.all(
        Object.values(COLLECTION_NAME).map(col =>
          getHealthModel(Object.keys(COLLECTION_NAME).find(k => COLLECTION_NAME[k] === col)!)
            .deleteMany({})
        )
      )
    }

    const counts = await Promise.all([
      upsertBatch('heart_rate',           body.heartRate        ?? []),
      upsertBatch('steps',                body.steps            ?? []),
      upsertBatch('distance',             body.distance         ?? []),
      upsertBatch('active_calories',      body.activeCalories   ?? []),
      upsertBatch('total_calories',       body.calories         ?? []),
      upsertBatch('exercise_session',     body.exercises        ?? []),
      upsertBatch('floors_climbed',       body.floors           ?? []),
      upsertBatch('elevation_gained',     body.elevation        ?? []),
      upsertBatch('speed',                body.speed            ?? []),
      upsertBatch('power',                body.power            ?? []),
      upsertBatch('vo2_max',              body.vo2max           ?? []),
      upsertBatch('wheelchair_pushes',    body.wheelchairPushes ?? []),
      upsertBatch('hrv',                  body.hrv              ?? []),
      upsertBatch('resting_heart_rate',   body.restingHeartRate ?? []),
      upsertBatch('spo2',                 body.spo2             ?? []),
      upsertBatch('respiratory_rate',     body.respiratoryRate  ?? []),
      upsertBatch('blood_pressure',       body.bloodPressure    ?? []),
      upsertBatch('blood_glucose',        body.bloodGlucose     ?? []),
      upsertBatch('body_temperature',     body.bodyTemperature  ?? []),
      upsertBatch('basal_body_temperature', body.basalBodyTemp  ?? []),
      upsertBatch('weight',               body.weight           ?? []),
      upsertBatch('height',               body.height           ?? []),
      upsertBatch('body_fat',             body.bodyFat          ?? []),
      upsertBatch('lean_body_mass',       body.leanBodyMass     ?? []),
      upsertBatch('bone_mass',            body.boneMass         ?? []),
      upsertBatch('basal_metabolic_rate', body.basalMetabolicRate ?? []),
      upsertBatch('body_water_mass',      body.bodyWaterMass    ?? []),
      upsertBatch('nutrition',            body.nutrition        ?? []),
      upsertBatch('hydration',            body.hydration        ?? []),
      upsertBatch('sleep',                body.sleep            ?? []),
      upsertBatch('menstruation_flow',    body.menstruationFlow   ?? []),
      upsertBatch('menstruation_period',  body.menstruationPeriod ?? []),
      upsertBatch('cervical_mucus',       body.cervicalMucus    ?? []),
      upsertBatch('ovulation_test',       body.ovulationTest    ?? []),
      upsertBatch('sexual_activity',      body.sexualActivity   ?? []),
      upsertBatch('intermenstrual_bleeding', body.intermenstrual ?? []),
    ])

    return NextResponse.json({ ok: true, upserted: counts.reduce((a, b) => a + b, 0) })
  } catch (err) {
    console.error('[health/ingest]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
