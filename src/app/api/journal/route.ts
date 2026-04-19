import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import JournalEntry from '@/lib/models/JournalEntry'

// GET /api/journal?date=YYYY-MM-DD
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  await connectDB()
  const entry = await JournalEntry.findOne({ date }).lean()
  return NextResponse.json({ content: (entry as any)?.content ?? '' })
}

// PUT /api/journal  { date, content }
export async function PUT(req: Request) {
  const { date, content } = await req.json()
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  await connectDB()
  await JournalEntry.findOneAndUpdate(
    { date },
    { date, content },
    { upsert: true, new: true }
  )
  return NextResponse.json({ ok: true })
}
