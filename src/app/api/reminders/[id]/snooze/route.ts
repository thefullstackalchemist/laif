import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ReminderModel from '@/lib/models/Reminder'
import { scheduleNotification, cancelNotification } from '@/lib/posthook'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await connectDB()

  const { snoozeMinutes } = await req.json() as { snoozeMinutes: number }
  if (!snoozeMinutes || snoozeMinutes <= 0) {
    return NextResponse.json({ error: 'snoozeMinutes must be a positive number' }, { status: 400 })
  }

  const newTime = new Date(Date.now() + snoozeMinutes * 60 * 1000)

  // Fetch first to get existing posthookId
  const existing = await ReminderModel.findById(params.id).lean() as Record<string, unknown> & { _id: unknown, posthookId?: string } | null
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cancel old hook before scheduling a new one
  if (existing.posthookId) await cancelNotification(existing.posthookId)

  const hook = await scheduleNotification({ id: params.id, type: 'reminder', fireAt: newTime })

  const reminder = await ReminderModel.findByIdAndUpdate(
    params.id,
    { reminderDate: newTime.toISOString(), notified: false, posthookId: hook?.id ?? null },
    { new: true }
  ).lean() as Record<string, unknown> & { _id: unknown } | null

  return NextResponse.json({ ...reminder, _id: String(reminder!._id), type: 'reminder' })
}
