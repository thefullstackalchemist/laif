import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ChatMessage from '@/lib/models/ChatMessage'

type RawMessage = {
  role: unknown
  content: unknown
  steps?: unknown[]
  timestamp?: unknown
}

function sanitizeMessages(raw: unknown[]): RawMessage[] {
  return raw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map(m => ({
      role:    ['user', 'assistant'].includes(String(m.role)) ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
      steps:   Array.isArray(m.steps)
        ? m.steps
            .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
            .map(s => ({
              id:   typeof s.id   === 'string' ? s.id.slice(0, 100)  : String(Date.now()),
              icon: typeof s.icon === 'string' ? s.icon.slice(0, 20) : 'search',
              text: typeof s.text === 'string' ? s.text.slice(0, 500): '',
            }))
            .slice(0, 30)
        : [],
      timestamp: m.timestamp ? new Date(String(m.timestamp)) : new Date(),
    }))
    .slice(0, 200)
}

/** GET — return all messages sorted by timestamp */
export async function GET() {
  await connectDB()
  const messages = await ChatMessage.find({}).sort({ timestamp: 1 }).lean()
  return NextResponse.json({ messages })
}

/** POST — replace conversation (delete all + insert each as its own document) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 })
  }

  const messages = sanitizeMessages(body.messages)
  await connectDB()

  await ChatMessage.deleteMany({})
  if (messages.length > 0) {
    await ChatMessage.insertMany(messages)
  }

  return NextResponse.json({ ok: true, saved: messages.length })
}

/** DELETE — clear all messages */
export async function DELETE() {
  await connectDB()
  await ChatMessage.deleteMany({})
  return NextResponse.json({ ok: true })
}
