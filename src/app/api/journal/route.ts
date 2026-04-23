import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import JournalEntry from '@/lib/models/JournalEntry'

// GET /api/journal?date=YYYY-MM-DD   → { content }
// GET /api/journal                   → { dates: string[] }  (all dates that have entries)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  await connectDB()

  if (!date) {
    const entries = await JournalEntry.find({}, { date: 1, _id: 0 }).lean()
    return NextResponse.json({ dates: entries.map((e: any) => e.date) })
  }

  const entry = await JournalEntry.findOne({ date }).lean() as any
  return NextResponse.json({
    content:         entry?.content         ?? '',
    last_summary:    entry?.last_summary    ?? '',
    summary_todos:   entry?.summary_todos   ?? [],
    today_items:     entry?.today_items     ?? [],
    summary_fetched: entry?.summary_fetched ?? false,
  })
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
