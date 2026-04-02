import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'
import { scheduleNotification } from '@/lib/posthook'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function GET() {
  await connectDB()
  const events = await EventModel.find().sort({ startDate: 1 }).lean() as LeanDoc[]
  return NextResponse.json(events.map(e => ({ ...e, _id: String(e._id), type: 'event' })))
}

export async function POST(req: Request) {
  await connectDB()
  const body = await req.json()
  const event = await EventModel.create(body)
  const plain = event.toObject() as LeanDoc

  // Schedule a notification to fire 15 minutes before the event starts
  if (plain.startDate) {
    scheduleNotification({
      id:            String(plain._id),
      type:          'event',
      fireAt:        new Date(plain.startDate as string),
      minutesBefore: 15,
    }).catch(err => console.error('[posthook] schedule error:', err))
  }

  return NextResponse.json({ ...plain, _id: String(plain._id), type: 'event' }, { status: 201 })
}
