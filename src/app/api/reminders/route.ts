import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ReminderModel from '@/lib/models/Reminder'
import { scheduleNotification } from '@/lib/posthook'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function GET() {
  await connectDB()
  const reminders = await ReminderModel.find().sort({ reminderDate: 1 }).lean() as LeanDoc[]
  return NextResponse.json(reminders.map(r => ({ ...r, _id: String(r._id), type: 'reminder' })))
}

export async function POST(req: Request) {
  await connectDB()
  const body = await req.json()
  const reminder = await ReminderModel.create(body)
  const plain = reminder.toObject() as LeanDoc

  // Schedule notification to fire exactly at reminder time
  if (plain.reminderDate) {
    await scheduleNotification({
      id:     String(plain._id),
      type:   'reminder',
      fireAt: new Date(plain.reminderDate as string),
    }).catch(err => console.error('[posthook] schedule error:', err))
  }

  return NextResponse.json({ ...plain, _id: String(plain._id), type: 'reminder' }, { status: 201 })
}
