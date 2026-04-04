import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ContactModel from '@/lib/models/Contact'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  await connectDB()
  const updated = await ContactModel.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true, runValidators: true }
  ).lean()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await ContactModel.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
