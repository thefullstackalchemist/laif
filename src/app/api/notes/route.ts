import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import NoteModel from '@/lib/models/Note'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function GET() {
  await connectDB()
  const notes = await NoteModel.find().sort({ createdAt: -1 }).lean() as LeanDoc[]
  return NextResponse.json(notes.map(n => ({ ...n, _id: String(n._id) })))
}

export async function POST(req: Request) {
  await connectDB()
  const body = await req.json()
  const note = await NoteModel.create(body)
  const plain = note.toObject() as LeanDoc
  return NextResponse.json({ ...plain, _id: String(plain._id) }, { status: 201 })
}
