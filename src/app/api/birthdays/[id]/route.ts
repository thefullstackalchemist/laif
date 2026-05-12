import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import BirthdayModel from '@/lib/models/Birthday'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await BirthdayModel.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
