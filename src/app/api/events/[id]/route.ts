import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import EventModel from '@/lib/models/Event'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  const body = await req.json()
  const event = await EventModel.findByIdAndUpdate(params.id, body, { new: true }).lean() as LeanDoc | null
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...event, _id: String(event._id), type: 'event' })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await EventModel.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
