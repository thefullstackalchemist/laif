import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import UmbrellaModel from '@/lib/models/Umbrella'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  const { name, color } = await req.json()
  const doc = await UmbrellaModel.findByIdAndUpdate(
    params.id,
    { ...(name && { name: name.trim() }), ...(color && { color }) },
    { new: true }
  ).lean() as LeanDoc | null
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...doc, _id: String(doc._id) })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await UmbrellaModel.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
