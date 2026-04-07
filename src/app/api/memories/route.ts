import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MemoryModel from '@/lib/models/Memory'
import TaskModel from '@/lib/models/Task'
import { MEMORY_TYPES, type MemoryType } from '@/types'

type LeanDoc = Record<string, unknown> & { _id: unknown }

// ─── AI Parser ──────────────────────────────────────────────────────────────

const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

const PARSE_SYSTEM = `You are a memory classifier. Parse user input into a JSON memory object.
Return ONLY valid JSON — no markdown, no explanation, just the JSON object.

Schema:
{
  "type": "book"|"movie"|"song"|"contact"|"shopping"|"task"|"place"|"quote"|"link"|"general",
  "title": "concise main title/name",
  "description": "extra context or null",
  "attributes": { "key": "value" },
  "status": "initial status or null"
}

Detection rules:
- "book", "read", "author", "novel" → type:book, attributes:{author?,year?,genre?}, status:"want-to-read"
- "movie","film","watch","series","show" → type:movie, attributes:{director?,year?,genre?}, status:"want-to-watch"
- "song","track","listen","music","artist","band","album","lyrics" → type:song, attributes:{artist?,album?,genre?,year?}, status:"want-to-listen"
- person name + "number","phone","email","contact" → type:contact, title:person name, attributes:{phone?,email?,company?,relation?}
- "buy","get","order","brand","grocery" → type:shopping, attributes:{brand?,quantity?,store?,price?}, status:"need"
- "remember to","need to","must","should do","todo" → type:task, attributes:{due?}, status:"pending"
- "restaurant","place","visit","go to","café","cafe" → type:place, attributes:{location?,type?}, status:"want-to-visit"
- quoted text attributed to someone → type:quote, title:the quote, attributes:{author?,source?}
- URL or "link","website","url","article" → type:link, attributes:{url?,category?}
- anything else → type:general

Extract real attribute values mentioned in the text. Keep title short and clean.`

async function parseWithAI(text: string): Promise<Partial<LeanDoc> | null> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pim.app',
        'X-Title': 'PIM',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: PARSE_SYSTEM },
          { role: 'user', content: text.slice(0, 500) },
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? ''
    return JSON.parse(content)
  } catch {
    return null
  }
}

/** Simple regex fallback when AI is unavailable */
function fallbackParse(text: string): Partial<LeanDoc> {
  const lower = text.toLowerCase()

  if (/\b(book|read|novel|author)\b/.test(lower)) {
    return { type: 'book', title: text.replace(/^remember (this |the )?book[:\s]*/i, '').trim(), status: 'want-to-read', attributes: {} }
  }
  if (/\b(movie|film|watch|series|show)\b/.test(lower)) {
    return { type: 'movie', title: text.replace(/^remember (this |the )?(movie|film|show|series)[:\s]*/i, '').trim(), status: 'want-to-watch', attributes: {} }
  }
  if (/\b(song|track|listen|music|artist|band|album|lyrics)\b/.test(lower)) {
    return { type: 'song', title: text.replace(/^remember (this |the )?(song|track|music)[:\s]*/i, '').trim(), status: 'want-to-listen', attributes: {} }
  }
  const contactMatch = text.match(/remember\s+(.+?)\s+with\s+(?:number|phone|email)[:\s]+(.+)/i)
  if (contactMatch) {
    return { type: 'contact', title: contactMatch[1].trim(), attributes: { phone: contactMatch[2].trim() } }
  }
  if (/\b(buy|get|order|brand|grocery|shopping)\b/.test(lower)) {
    return { type: 'shopping', title: text.replace(/^remember (to )?(buy|get|order)[:\s]*/i, '').trim(), status: 'need', attributes: {} }
  }
  if (/^remember to\b/i.test(text) || /\b(must|need to|should|todo)\b/.test(lower)) {
    return { type: 'task', title: text.replace(/^remember to\s+/i, '').trim(), status: 'pending', attributes: {} }
  }
  if (/\b(place|restaurant|visit|go to|café|cafe)\b/.test(lower)) {
    return { type: 'place', title: text.replace(/^remember (to visit )?/i, '').trim(), status: 'want-to-visit', attributes: {} }
  }

  return { type: 'general', title: text.replace(/^remember\s*/i, '').trim() || text, attributes: {} }
}

// ─── Validation ──────────────────────────────────────────────────────────────

function sanitizeStr(v: unknown, max = 500) { return typeof v === 'string' ? v.trim().slice(0, max) : '' }
function sanitizeAttrs(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>)
      .filter(([k, val]) => typeof k === 'string' && typeof val === 'string')
      .map(([k, val]) => [k.slice(0, 50), (val as string).slice(0, 300)])
      .slice(0, 20)
  )
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function GET() {
  await connectDB()
  const memories = await MemoryModel.find().sort({ createdAt: -1 }).lean() as LeanDoc[]
  return NextResponse.json(memories.map(m => ({ ...m, _id: String(m._id) })))
}

export async function POST(req: Request) {
  await connectDB()
  const body = await req.json().catch(() => ({}))

  let parsed: Partial<LeanDoc>

  if (typeof body.text === 'string' && body.text.trim()) {
    // Natural language → AI parse (with fallback)
    const aiResult = await parseWithAI(body.text.trim())
    parsed = aiResult ?? fallbackParse(body.text.trim())
  } else {
    // Structured input from manual form
    parsed = body
  }

  // Validate and sanitize
  const type = MEMORY_TYPES.includes(parsed.type as MemoryType) ? (parsed.type as MemoryType) : 'general'
  const title = sanitizeStr(parsed.title, 300) || sanitizeStr(body.text, 100) || 'Untitled'
  const description = sanitizeStr(parsed.description, 1000) || undefined
  const attributes = sanitizeAttrs(parsed.attributes)
  const status = sanitizeStr(parsed.status, 50) || undefined
  const priority = ['low', 'medium', 'high'].includes(String(parsed.priority)) ? String(parsed.priority) : undefined

  let linkedTaskId: string | undefined

  // If type is task, also create a calendar task
  if (type === 'task') {
    const task = await TaskModel.create({
      title,
      description,
      dueDate: attributes.due ? new Date(attributes.due) : undefined,
      priority: priority ?? 'medium',
      status: 'todo',
      color: '#34d399',
    })
    linkedTaskId = String(task._id)
  }

  const memory = await MemoryModel.create({
    type, title, description, attributes, status, priority,
    linkedTaskId,
  })

  return NextResponse.json(
    { ...memory.toObject(), _id: String(memory._id), linkedTaskId },
    { status: 201 }
  )
}
