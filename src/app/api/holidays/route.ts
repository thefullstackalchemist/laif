import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import HolidayModel from '@/lib/models/Holiday'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function GET() {
  await connectDB()
  const docs = await HolidayModel.find().sort({ date: 1 }).lean() as LeanDoc[]
  return NextResponse.json(docs.map(d => ({ ...d, _id: String(d._id) })))
}

export async function POST(req: Request) {
  await connectDB()
  const { name, date } = await req.json()
  if (!name?.trim() || !date) return NextResponse.json({ error: 'name and date required' }, { status: 400 })
  const doc = await HolidayModel.create({ name: name.trim(), date })
  const plain = doc.toObject() as LeanDoc
  return NextResponse.json({ ...plain, _id: String(plain._id) }, { status: 201 })
}
