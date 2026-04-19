import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import FsNote from '@/lib/models/FsNote'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectDB()
  const note = await FsNote.findById(id).lean()
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(note)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectDB()
  const body = await req.json()
  const note = await FsNote.findByIdAndUpdate(id, body, { new: true, upsert: false }).lean()
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(note)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectDB()
  await FsNote.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
