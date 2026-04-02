import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ReminderModel from '@/lib/models/Reminder'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  const body = await req.json()
  const reminder = await ReminderModel.findByIdAndUpdate(params.id, body, { new: true }).lean() as LeanDoc | null
  if (!reminder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...reminder, _id: String(reminder._id), type: 'reminder' })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await ReminderModel.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
