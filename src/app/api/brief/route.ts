import { NextResponse } from 'next/server'
import type { AnyItem, CalendarEvent, Task, Reminder } from '@/types'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

export async function POST(req: Request) {
  const { items = [] }: { items: AnyItem[] } = await req.json().catch(() => ({ items: [] }))

  const now  = new Date()
  const hour = now.getHours()
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }

  const events    = items.filter(i => i.type === 'event') as CalendarEvent[]
  const tasks     = items.filter(i => i.type === 'task' && (i as Task).status !== 'done') as Task[]
  const reminders = items.filter(i => i.type === 'reminder') as Reminder[]
  const overdue   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now)

  const lines: string[] = [
    `Today is ${now.toDateString()}, ${period}.`,
    events.length
      ? `Events: ${events.map(e => `"${e.title}" at ${fmt(e.startDate)}`).join('; ')}`
      : 'No events today.',
    tasks.length
      ? `Pending tasks: ${tasks.map(t => `"${t.title}"${t.priority === 'high' ? ' (high priority)' : ''}`).join('; ')}`
      : 'No pending tasks.',
    overdue.length ? `Overdue: ${overdue.map(t => `"${t.title}"`).join(', ')}` : '',
    reminders.length ? `Reminders: ${reminders.map(r => `"${r.title}" at ${fmt(r.reminderDate)}`).join('; ')}` : '',
  ].filter(Boolean)

  const prompt = `You are a personal assistant writing a warm, concise daily brief. Write exactly 1-2 sentences summarising what's ahead today. Be specific, mention key items by name if there are few, use a natural tone. No bullet points, no markdown, no sign-off. Output only the brief text.

Context:
${lines.join('\n')}`

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ brief: `Good ${period}! You have ${events.length} event(s) and ${tasks.length} task(s) today.` })
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://laifx.app',
        'X-Title': 'Laif',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.65,
      }),
    })
    const data = await res.json()
    const brief = (data?.choices?.[0]?.message?.content ?? '').trim()
    return NextResponse.json({ brief })
  } catch {
    return NextResponse.json({ brief: `Good ${period}! You have ${events.length} event(s) and ${tasks.length} task(s) today.` })
  }
}
