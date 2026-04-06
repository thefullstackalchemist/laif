import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'
import { scheduleNotification } from '@/lib/posthook'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await connectDB()

  const { minutesBefore = 15 } = await req.json() as { minutesBefore?: number }

  const event = await EventModel.findById(params.id).lean() as Record<string, unknown> & { _id: unknown } | null
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const startDate = new Date(event.startDate as string)
  const fireAt    = new Date(startDate.getTime() - minutesBefore * 60 * 1000)

  if (fireAt <= new Date()) {
    return NextResponse.json({ error: 'Reminder time is already in the past' }, { status: 400 })
  }

  await scheduleNotification({ id: params.id, type: 'event', fireAt: startDate, minutesBefore })

  return NextResponse.json({ ok: true, fireAt: fireAt.toISOString() })
}
