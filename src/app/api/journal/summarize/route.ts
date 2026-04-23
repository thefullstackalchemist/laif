import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import JournalEntry from '@/lib/models/JournalEntry'

const EMPTY_DOC = '{"type":"doc","content":[{"type":"paragraph"}]}'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'

// Recursively extract plain text from a Tiptap JSON node
function extractText(node: any): string {
  if (node.type === 'text') return node.text ?? ''
  if (!node.content) return ''
  return node.content.map(extractText).join(' ')
}

// GET /api/journal/summarize?date=YYYY-MM-DD&today=YYYY-MM-DD
// Fetches the entry for `date`, summarises it with AI, saves result to `today`'s entry
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date  = searchParams.get('date')   // yesterday
  const today = searchParams.get('today')  // today — where we persist the result

  if (!date || !today) {
    return NextResponse.json({ error: 'Missing date or today param' }, { status: 400 })
  }

  await connectDB()

  const entry   = await JournalEntry.findOne({ date }).lean() as any
  const content = entry?.content ?? ''

  if (!content || content === EMPTY_DOC) {
    return NextResponse.json({ summary: '', todos: [] })
  }

  let text = ''
  try { text = extractText(JSON.parse(content)).trim() } catch { /* ignore */ }

  if (!text) return NextResponse.json({ summary: '', todos: [] })

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ summary: '', todos: [] })
  }

  let summary     = ''
  let todos:       string[] = []
  let todayItems:  string[] = []

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
        messages: [{
          role: 'user',
          content: `You are a personal productivity assistant reviewing someone's journal entry from yesterday.

Provide three things:
1. "summary" — a concise 2-3 sentence recap of the key themes, activities, decisions, and feelings from yesterday
2. "todos" — up to 5 carry-forward tasks that were explicitly mentioned or clearly left unfinished yesterday
3. "today" — up to 3 sharp, high-priority focus items the person should tackle TODAY, inferred from the context and momentum of yesterday's entry (e.g. next steps, pending decisions, follow-ups). Make these feel urgent and specific to today.

Respond ONLY with valid JSON — no markdown, no extra text:
{"summary":"...","todos":["..."],"today":["..."]}

Journal entry:
${text}`,
        }],
        max_tokens: 550,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (res.ok) {
      const data   = await res.json()
      const raw    = data?.choices?.[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw)
      summary    = typeof parsed.summary === 'string' ? parsed.summary : ''
      todos      = Array.isArray(parsed.todos) ? parsed.todos.filter((t: any) => typeof t === 'string') : []
      todayItems = Array.isArray(parsed.today) ? parsed.today.filter((t: any) => typeof t === 'string') : []
    }
  } catch { /* return empty on any AI error */ }

  // Always persist — even an empty result marks summary_fetched so AI won't re-run
  await JournalEntry.findOneAndUpdate(
    { date: today },
    { $set: { last_summary: summary, summary_todos: todos, today_items: todayItems, summary_fetched: true } },
    { upsert: true }
  )

  return NextResponse.json({ summary, todos, today: todayItems })
}
