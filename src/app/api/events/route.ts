import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'

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
  return NextResponse.json({ ...plain, _id: String(plain._id), type: 'event' }, { status: 201 })
}
