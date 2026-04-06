import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'

export async function addComment(Model: mongoose.Model<unknown>, id: string, text: string) {
  await connectDB()
  if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })
  const updated = await (Model as any).findByIdAndUpdate(
    id,
    { $push: { comments: { text: text.trim(), createdAt: new Date() } } },
    { new: true }
  ).lean()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const doc = updated as Record<string, unknown> & { _id: unknown }
  return NextResponse.json({ ...doc, _id: String(doc._id) })
}
