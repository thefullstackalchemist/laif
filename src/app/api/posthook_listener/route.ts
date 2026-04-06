import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'
import ReminderModel from '@/lib/models/Reminder'
import TaskModel from '@/lib/models/Task'
import DeviceModel from '@/lib/models/Device'
import WebPushSubscriptionModel from '@/lib/models/WebPushSubscription'
import { messaging, rtdb } from '@/lib/firebase-admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

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
  const raw = await req.text().catch(() => '')
  console.log('[posthook_listener] raw body:', raw)

  let body: Record<string, unknown> | null = null
  try {
    // PostHook sometimes wraps the payload in single quotes
    const cleaned = raw.trim().replace(/^'+|'+$/g, '')
    body = JSON.parse(cleaned)
  } catch {
    console.error('[posthook_listener] Failed to parse body:', raw)
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const payload = (body?.data as Record<string, unknown> | null) ?? body ?? {}
  const type = payload.type as string | undefined
  const id   = payload.id   as string | undefined

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

  // Write to Firebase RTDB so the web app can pick it up via polling
  try {
    const ref = rtdb().ref('web-notifications').push()
    await ref.set({
      title:     notification.title,
      body:      notification.body,
      type,
      itemId:    String(id),
      createdAt: Date.now(),
      read:      false,
    })
    console.log(`[posthook_listener] RTDB notification written: ${ref.key}`)
  } catch (err) {
    console.warn('[posthook_listener] RTDB write failed (non-fatal):', err)
  }

  // Send Web Push to all browser subscribers
  try {
    const subs = await WebPushSubscriptionModel.find({}).lean() as unknown as {
      endpoint: string; keys: { p256dh: string; auth: string }
    }[]

    if (subs.length) {
      const payload = JSON.stringify({ title: notification.title, body: notification.body, url: '/' })
      const results = await Promise.allSettled(
        subs.map(s =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload)
        )
      )
      const failed = results.filter(r => r.status === 'rejected').length
      console.log(`[posthook_listener] Web Push: ${subs.length - failed}/${subs.length} sent`)

      // Prune dead subscriptions (410 Gone)
      const deadEndpoints: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const err = (r as PromiseRejectedResult).reason
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            deadEndpoints.push(subs[i].endpoint)
          }
        }
      })
      if (deadEndpoints.length) {
        await WebPushSubscriptionModel.deleteMany({ endpoint: { $in: deadEndpoints } })
        console.log(`[posthook_listener] Removed ${deadEndpoints.length} expired subscriptions`)
      }
    }
  } catch (err) {
    console.warn('[posthook_listener] Web Push failed (non-fatal):', err)
  }

  if (type === 'reminder') {
    await ReminderModel.findByIdAndUpdate(id, { notified: true })
  }

  return NextResponse.json({ ok: true, type, id, title })
}
