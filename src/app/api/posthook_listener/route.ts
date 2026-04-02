import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'
import ReminderModel from '@/lib/models/Reminder'
import TaskModel from '@/lib/models/Task'

const SUPPORTED_TYPES = ['event', 'reminder', 'task'] as const
type ItemType = typeof SUPPORTED_TYPES[number]

const MODEL_MAP = {
  event:    EventModel,
  reminder: ReminderModel,
  task:     TaskModel,
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  const { type, id } = body?.data ?? body ?? {}

  if (!type || !id) {
    return NextResponse.json({ error: 'Missing type or id in payload' }, { status: 400 })
  }

  if (!SUPPORTED_TYPES.includes(type as ItemType)) {
    return NextResponse.json({ error: `Unsupported type: ${type}` }, { status: 400 })
  }

  await connectDB()
  const model = MODEL_MAP[type as ItemType]
  const item = await model.findById(id).lean() as Record<string, unknown> | null

  if (!item) {
    console.warn(`[posthook_listener] ${type}:${id} not found`)
    return NextResponse.json({ ok: true, skipped: 'item not found' })
  }

  console.log(`[posthook_listener] Fired for ${type}:${id} — title: ${item.title}`)

  // ── Send push notification ──────────────────────────────────────────────
  // TODO: integrate FCM here once Firebase is configured
  // await sendPushNotification({ type, item })
  // ───────────────────────────────────────────────────────────────────────

  // Mark reminder as notified
  if (type === 'reminder') {
    await ReminderModel.findByIdAndUpdate(id, { notified: true })
  }

  return NextResponse.json({ ok: true, type, id, title: item.title })
}
