import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ReminderModel from '@/lib/models/Reminder'
import { scheduleNotification } from '@/lib/posthook'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await connectDB()

  const { snoozeMinutes } = await req.json() as { snoozeMinutes: number }
  if (!snoozeMinutes || snoozeMinutes <= 0) {
    return NextResponse.json({ error: 'snoozeMinutes must be a positive number' }, { status: 400 })
  }

  const newTime = new Date(Date.now() + snoozeMinutes * 60 * 1000)

  const reminder = await ReminderModel.findByIdAndUpdate(
    params.id,
    { reminderDate: newTime.toISOString(), notified: false },
    { new: true }
  ).lean() as Record<string, unknown> & { _id: unknown } | null

  if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Re-schedule the posthook for the new time
  await scheduleNotification({ id: params.id, type: 'reminder', fireAt: newTime })

  return NextResponse.json({ ...reminder, _id: String(reminder._id), type: 'reminder' })
}
