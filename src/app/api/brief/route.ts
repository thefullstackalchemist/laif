import { NextResponse } from 'next/server'
import type { AnyItem, CalendarEvent, Task, Reminder } from '@/types'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

function dayDiff(iso: string, now: Date): number {
  const d = new Date(iso)
  return Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
     new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000
  )
}

function dayLabel(diff: number): string {
  if (diff === 0)  return 'today'
  if (diff === 1)  return 'tomorrow'
  if (diff > 1)    return `in ${diff} days`
  if (diff === -1) return '1 day overdue'
  return `${Math.abs(diff)} days overdue`
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

/** Deterministic fallback — never hallucinates */
function buildFallback(
  period: string,
  todayItems: string[],
  tomorrowItems: string[],
  overdue: string[],
): string {
  const parts: string[] = []

  if (overdue.length) {
    parts.push(`You have ${overdue.length} overdue item${overdue.length > 1 ? 's' : ''} (${overdue.join(', ')}) still pending.`)
  }

  if (todayItems.length === 0 && tomorrowItems.length === 0) {
    return `Good ${period}! Nothing scheduled — a good time to get ahead.`
  }

  if (todayItems.length > 0) {
    parts.push(`Today: ${todayItems.join(', ')}.`)
  } else {
    parts.push(`Nothing scheduled for today.`)
  }

  if (tomorrowItems.length > 0) {
    parts.push(`Tomorrow: ${tomorrowItems.join(', ')}.`)
  }

  return parts.join(' ')
}

export async function POST(req: Request) {
  const { items = [] }: { items: AnyItem[] } = await req.json().catch(() => ({ items: [] }))

  const now    = new Date()
  const hour   = now.getHours()
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // ── Bucket items by day relative to now ──────────────────────────────
  const events    = (items.filter(i => i.type === 'event')    as CalendarEvent[])
  const tasks     = (items.filter(i => i.type === 'task' && (i as Task).status !== 'done') as Task[])
  const reminders = (items.filter(i => i.type === 'reminder') as Reminder[])

  const todayLines:    string[] = []
  const tomorrowLines: string[] = []
  const upcomingLines: string[] = []
  const overdueLines:  string[] = []

  for (const e of events) {
    const diff  = dayDiff(e.startDate, now)
    const label = dayLabel(diff)
    const time  = fmtTime(e.startDate)
    const entry = `event "${e.title}" at ${time}`
    if (diff === 0)      todayLines.push(entry)
    else if (diff === 1) tomorrowLines.push(entry)
    else if (diff > 1)   upcomingLines.push(`${entry} (${label})`)
    // past events ignored
  }

  for (const t of tasks) {
    if (!t.dueDate) { todayLines.push(`task "${t.title}" (no due date)`); continue }
    const diff  = dayDiff(t.dueDate, now)
    const label = dayLabel(diff)
    const pri   = t.priority === 'high' ? ' [high priority]' : ''
    const entry = `task "${t.title}"${pri}`
    if (diff === 0)      todayLines.push(entry)
    else if (diff === 1) tomorrowLines.push(entry)
    else if (diff < 0)   overdueLines.push(`${entry} (${label})`)   // any past date = overdue
    else                 upcomingLines.push(`${entry} (due ${label})`)
  }

  for (const r of reminders) {
    const diff  = dayDiff(r.reminderDate, now)
    const label = dayLabel(diff)
    const time  = fmtTime(r.reminderDate)
    const entry = `reminder "${r.title}" at ${time}`
    if (diff === 0)      todayLines.push(entry)
    else if (diff === 1) tomorrowLines.push(entry)
    else if (diff > 1)   upcomingLines.push(`${entry} (${label})`)
  }

  // ── Build fallback labels (no times, just titles) ─────────────────────
  const todayTitles = [...events, ...tasks, ...reminders]
    .filter(i => {
      const d = i.type === 'event' ? (i as CalendarEvent).startDate : i.type === 'task' ? (i as Task).dueDate ?? '' : (i as Reminder).reminderDate
      return d && dayDiff(d, now) === 0
    })
    .map(i => i.title)

  const tomorrowTitles = [...events, ...tasks, ...reminders]
    .filter(i => {
      const d = i.type === 'event' ? (i as CalendarEvent).startDate : i.type === 'task' ? (i as Task).dueDate ?? '' : (i as Reminder).reminderDate
      return d && dayDiff(d, now) === 1
    })
    .map(i => i.title)

  const overdueTitles = tasks
    .filter(t => t.dueDate && dayDiff(t.dueDate, now) < 0)
    .map(t => t.title)

  const fallback = buildFallback(period, todayTitles, tomorrowTitles, overdueTitles)

  // ── Skip AI call if nothing is scheduled ─────────────────────────────
  if (todayLines.length === 0 && tomorrowLines.length === 0 && overdueLines.length === 0) {
    const extra = upcomingLines.length ? ` Next up: ${upcomingLines[0]}.` : ''
    return NextResponse.json({ brief: `Good ${period}! Nothing on the schedule for today or tomorrow.${extra}` })
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ brief: fallback })
  }

  // ── Build strictly-grounded context for the AI ───────────────────────
  const contextLines: string[] = [
    `Current time: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${period})`,
    `Today (${now.toDateString()}):`,
    ...(todayLines.length ? todayLines.map(l => `  - ${l}`) : ['  - nothing']),
  ]
  if (tomorrowLines.length) {
    contextLines.push('Tomorrow:')
    tomorrowLines.forEach(l => contextLines.push(`  - ${l}`))
  }
  if (overdueLines.length) {
    contextLines.push('Overdue:')
    overdueLines.forEach(l => contextLines.push(`  - ${l}`))
  }
  if (upcomingLines.length) {
    contextLines.push('Upcoming:')
    upcomingLines.slice(0, 3).forEach(l => contextLines.push(`  - ${l}`))
  }

  const systemMsg = `You are a concise personal assistant. Your ONLY job is to summarise the schedule data provided by the user into 1–2 plain sentences. Rules:
- ONLY mention items that are explicitly listed in the data below. Do not add, infer, or invent any tasks, events, or details that are not in the list.
- Do not give advice, suggestions, or action items.
- No bullet points, no markdown, no greeting, no sign-off.
- Output only the brief text, nothing else.`

  const userMsg = `Here is my current schedule data:\n\n${contextLines.join('\n')}\n\nWrite a 1–2 sentence brief strictly based on this data only.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pim.app',
        'X-Title': 'PIM',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user',   content: userMsg },
        ],
        max_tokens: 80,
        temperature: 0.1,   // low temp = factual, less hallucination
      }),
    })
    const data  = await res.json()
    const brief = (data?.choices?.[0]?.message?.content ?? '').trim()

    // Sanity-check: if the model output is empty or suspiciously long, use fallback
    if (!brief || brief.length > 300) return NextResponse.json({ brief: fallback })

    return NextResponse.json({ brief })
  } catch {
    return NextResponse.json({ brief: fallback })
  }
}
