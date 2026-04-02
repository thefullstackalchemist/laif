import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'
import ReminderModel from '@/lib/models/Reminder'
import TaskModel from '@/lib/models/Task'
import DeviceModel from '@/lib/models/Device'
import { messaging } from '@/lib/firebase-admin'

const SUPPORTED_TYPES = ['event', 'reminder', 'task'] as const
type ItemType = typeof SUPPORTED_TYPES[number]

const MODEL_MAP = {
  event:    EventModel,
  reminder: ReminderModel,
  task:     TaskModel,
}

const NOTIFICATION_COPY: Record<ItemType, (title: string) => { title: string; body: string }> = {
  event:    t => ({ title: '📅 Upcoming event',  body: `"${t}" starts in 15 minutes` }),
  reminder: t => ({ title: '🔔 Reminder',         body: t }),
  task:     t => ({ title: '✅ Task due',          body: `"${t}" is due now` }),
}

async function sendPushToAllDevices(notification: { title: string; body: string }, data: Record<string, string>) {
  await connectDB()
  const devices = await DeviceModel.find({}).lean() as unknown as { fcmToken: string }[]
  if (!devices.length) return

  const msg = messaging()
  const results = await Promise.allSettled(
    devices.map(d =>
      msg.send({
        token: d.fcmToken,
        notification,
        data,
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'laif_notifications' },
        },
      })
    )
  )

  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length) console.warn(`[posthook_listener] ${failed.length} push(es) failed`)
  console.log(`[posthook_listener] Sent ${results.length - failed.length}/${results.length} notifications`)
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

  const title = String(item.title ?? '')
  console.log(`[posthook_listener] Fired for ${type}:${id} — "${title}"`)

  const notification = NOTIFICATION_COPY[type as ItemType](title)
  await sendPushToAllDevices(notification, { type, id: String(id) })

  if (type === 'reminder') {
    await ReminderModel.findByIdAndUpdate(id, { notified: true })
  }

  return NextResponse.json({ ok: true, type, id, title })
}
