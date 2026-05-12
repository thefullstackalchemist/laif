import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import HolidayModel from '@/lib/models/Holiday'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await HolidayModel.findByIdAndDelete(params.id)
  return NextResponse.json({ ok: true })
}
