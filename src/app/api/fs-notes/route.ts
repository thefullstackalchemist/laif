import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FsNote from '@/lib/models/FsNote'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: Request) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const parent = searchParams.get('parent')
  const date   = searchParams.get('date')

  const query: Record<string, unknown> = {}
  if (parent) query.parent = parent
  if (date)   query.date   = date

  const notes = await FsNote.find(query).sort({ updatedAt: -1 }).lean()
  return NextResponse.json(notes)
}

export async function POST(req: Request) {
  await connectDB()
  const body = await req.json()
  const note = await FsNote.create({ _id: uuidv4(), ...body })
  return NextResponse.json(note.toObject(), { status: 201 })
}
