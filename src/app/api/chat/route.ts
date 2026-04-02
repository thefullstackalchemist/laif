import { connectDB } from '@/lib/mongodb'
import EventModel    from '@/lib/models/Event'
import TaskModel     from '@/lib/models/Task'
import ReminderModel from '@/lib/models/Reminder'
import NoteModel     from '@/lib/models/Note'
import MemoryModel   from '@/lib/models/Memory'
import { scheduleNotification } from '@/lib/posthook'

// ─── Stream chunk types ────────────────────────────────────────────────────
export type StepIcon = 'search' | 'found' | 'warn' | 'clash' | 'add' | 'done' | 'err'
export type StreamChunk =
  | { t: 's'; icon: StepIcon; text: string }
  | { t: 'd'; text: string }
  | { t: 'refresh' }
  | { t: 'err'; text: string }

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'
const MAX_ITER = 6

// ─── Sanitization ──────────────────────────────────────────────────────────

function sanitizeStr(val: unknown, maxLen = 500): string {
  return typeof val === 'string' ? val.trim().slice(0, maxLen) : ''
}
function sanitizeDate(val: unknown): string {
  if (typeof val !== 'string' && typeof val !== 'number') throw new Error('Invalid date')
  const d = new Date(val as string)
  if (isNaN(d.getTime())) throw new Error(`Not a valid date: ${val}`)
  return d.toISOString()
}
function sanitizeEnum<T extends string>(val: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(val as T) ? (val as T) : fallback
}
function sanitizeUserMsg(msg: string): string {
  return msg.slice(0, 2000)
    .replace(/<tool_call>/gi, '[tool_call]')
    .replace(/<\/tool_call>/gi, '[/tool_call]')
}

// ─── Date resolution ───────────────────────────────────────────────────────
// Accepts "today", "tomorrow", "YYYY-MM-DD", ISO strings, or empty (= no filter)

function resolveDate(raw: unknown, timezone?: string): Date | null {
  if (!raw || typeof raw !== 'string') return null
  const lower = raw.toLowerCase().trim()

  // Get current date in user's timezone
  const tz = timezone || 'UTC'
  const localNowStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz }) // "2026-04-02"
  const localNow = new Date(localNowStr + 'T00:00:00')

  if (lower === 'today')     return localNow
  if (lower === 'tomorrow')  { const d = new Date(localNow); d.setDate(d.getDate() + 1); return d }
  if (lower === 'yesterday') { const d = new Date(localNow); d.setDate(d.getDate() - 1); return d }
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d); start.setHours(0, 0, 0, 0)
  const end   = new Date(d); end.setHours(23, 59, 59, 999)
  return { start, end }
}

// ─── Formatters (strip IDs, only human-readable data sent to AI) ──────────

type LeanDoc = Record<string, unknown> & { _id: unknown }

function fmtEvent(e: LeanDoc) {
  return {
    type: 'event',
    title: String(e.title ?? ''),
    start: String(e.startDate ?? ''),
    end:   String(e.endDate   ?? ''),
    ...(e.location ? { location: String(e.location) } : {}),
  }
}
function fmtTask(t: LeanDoc) {
  return {
    type:     'task',
    title:    String(t.title    ?? ''),
    status:   String(t.status   ?? 'todo'),
    priority: String(t.priority ?? 'medium'),
    ...(t.dueDate ? { due: String(t.dueDate) } : {}),
  }
}
function fmtReminder(r: LeanDoc) {
  return { type: 'reminder', title: String(r.title ?? ''), at: String(r.reminderDate ?? '') }
}
function fmtNote(n: LeanDoc) {
  const content = String(n.content ?? '').trim()
  return content ? { type: 'note', content: content.slice(0, 200) } : null
}
function fmtMemory(m: LeanDoc) {
  return {
    type:   'memory',
    kind:   String(m.type   ?? ''),
    title:  String(m.title  ?? ''),
    ...(m.status      ? { status:      String(m.status)      } : {}),
    ...(m.description ? { description: String(m.description).slice(0, 150) } : {}),
    ...(m.attributes && typeof m.attributes === 'object'
      ? { attributes: Object.fromEntries(
            Object.entries(m.attributes as Record<string, unknown>)
              .filter(([,v]) => typeof v === 'string')
              .slice(0, 5)
              .map(([k, v]) => [k, String(v).slice(0, 80)])
          ) }
      : {}),
  }
}

// ─── Tool: fetch_data ──────────────────────────────────────────────────────
// what: array of "events"|"tasks"|"reminders"|"notes"|"memories"  (or ["all"])
// when: optional date shorthand or YYYY-MM-DD
// time_from / time_to: optional ISO time strings for narrower range

const FETCHABLE = ['events', 'tasks', 'reminders', 'notes', 'memories'] as const
type Fetchable = typeof FETCHABLE[number]

async function toolFetchData(args: Record<string, unknown>, timezone?: string) {
  await connectDB()

  // Parse what[]
  let what: Fetchable[]
  if (Array.isArray(args.what)) {
    what = (args.what as unknown[])
      .map(w => String(w).toLowerCase())
      .filter((w): w is Fetchable => w === 'all' || (FETCHABLE as readonly string[]).includes(w))
    if (what.includes('all' as Fetchable) || what.length === 0) what = [...FETCHABLE]
  } else {
    what = [...FETCHABLE]
  }

  // Resolve date / time filter
  const targetDate = resolveDate(args.when, timezone)
  let dateFilter: { start: Date; end: Date } | null = null

  if (targetDate) {
    dateFilter = dayBounds(targetDate)
    // Narrow to explicit time range if provided
    if (args.time_from) {
      try {
        const tf = new Date(sanitizeDate(args.time_from))
        dateFilter.start = tf
      } catch { /* ignore */ }
    }
    if (args.time_to) {
      try {
        const tt = new Date(sanitizeDate(args.time_to))
        dateFilter.end = tt
      } catch { /* ignore */ }
    }
  }

  const df = dateFilter

  const [events, tasks, reminders, notes, memories] = await Promise.all([
    what.includes('events')
      ? EventModel.find(df ? { startDate: { $gte: df.start, $lte: df.end } } : {})
          .sort({ startDate: 1 }).limit(30).lean() as Promise<LeanDoc[]>
      : Promise.resolve([]),

    what.includes('tasks')
      ? TaskModel.find(df ? { dueDate: { $gte: df.start, $lte: df.end } } : {})
          .sort({ dueDate: 1 }).limit(30).lean() as Promise<LeanDoc[]>
      : Promise.resolve([]),

    what.includes('reminders')
      ? ReminderModel.find(df ? { reminderDate: { $gte: df.start, $lte: df.end } } : {})
          .sort({ reminderDate: 1 }).limit(30).lean() as Promise<LeanDoc[]>
      : Promise.resolve([]),

    what.includes('notes')
      ? NoteModel.find({}).sort({ updatedAt: -1 }).limit(20).lean() as Promise<LeanDoc[]>
      : Promise.resolve([]),

    what.includes('memories')
      ? MemoryModel.find({}).sort({ createdAt: -1 }).limit(40).lean() as Promise<LeanDoc[]>
      : Promise.resolve([]),
  ])

  const fmtEvents    = what.includes('events')    ? events.map(fmtEvent)               : undefined
  const fmtTasks     = what.includes('tasks')     ? tasks.map(fmtTask)                 : undefined
  const fmtReminders = what.includes('reminders') ? reminders.map(fmtReminder)         : undefined
  const fmtNotes     = what.includes('notes')     ? notes.map(fmtNote).filter(Boolean) : undefined
  const fmtMemories  = what.includes('memories')  ? memories.map(fmtMemory)            : undefined

  const total =
    (fmtEvents?.length    ?? 0) +
    (fmtTasks?.length     ?? 0) +
    (fmtReminders?.length ?? 0) +
    (fmtNotes?.length     ?? 0) +
    (fmtMemories?.length  ?? 0)

  return {
    fetched: what,
    ...(df ? { for_date: targetDate!.toDateString() } : { scope: 'all' }),
    ...(fmtEvents    !== undefined ? { events:    fmtEvents    } : {}),
    ...(fmtTasks     !== undefined ? { tasks:     fmtTasks     } : {}),
    ...(fmtReminders !== undefined ? { reminders: fmtReminders } : {}),
    ...(fmtNotes     !== undefined ? { notes:     fmtNotes     } : {}),
    ...(fmtMemories  !== undefined ? { memories:  fmtMemories  } : {}),
    total,
  }
}

// ─── Tool: check_availability ──────────────────────────────────────────────

async function toolCheckAvailability(args: Record<string, unknown>) {
  const start = new Date(sanitizeDate(args.start))
  const end   = new Date(sanitizeDate(args.end))
  if (start >= end) return { available: false, error: 'start must be before end' }

  await connectDB()
  const conflicts = await EventModel.find({
    startDate: { $lt: end },
    endDate:   { $gt: start },
  }).lean() as LeanDoc[]

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map(e => ({
      title: String(e.title ?? ''),
      start: String(e.startDate ?? ''),
      end:   String(e.endDate   ?? ''),
    })),
  }
}

// ─── Tool: add_event / add_task / add_reminder ─────────────────────────────

async function toolAddEvent(args: Record<string, unknown>) {
  const title = sanitizeStr(args.title, 300)
  if (!title) throw new Error('title is required')
  const startDate = new Date(sanitizeDate(args.startDate))
  let endDate = new Date(sanitizeDate(args.endDate))
  // Auto-fix: if AI sends equal or reversed dates, default to 1h event
  if (endDate <= startDate) endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
  await connectDB()
  const doc = await EventModel.create({
    title,
    description: sanitizeStr(args.description, 1000) || undefined,
    startDate, endDate,
    location: sanitizeStr(args.location, 200) || undefined,
    color: '#5b8ded',
  })
  if (!doc?._id) throw new Error('DB write failed — no document returned')
  scheduleNotification({ id: String(doc._id), type: 'event', fireAt: startDate, minutesBefore: 15 })
    .catch(err => console.error('[posthook] event schedule error:', err))
  return { success: true, title, id: String(doc._id) }
}

async function toolUpdateTask(args: Record<string, unknown>) {
  const title  = sanitizeStr(args.title, 300)
  const status = sanitizeEnum(args.status, ['todo', 'in-progress', 'done'], 'todo')
  if (!title) throw new Error('title is required to find the task')
  await connectDB()
  // Match by title (case-insensitive) — find the most recent match
  const task = await TaskModel.findOne({ title: { $regex: new RegExp(title, 'i') } })
    .sort({ createdAt: -1 }).lean() as LeanDoc | null
  if (!task) return { success: false, error: `No task found matching "${title}"` }
  const update: Record<string, unknown> = { status }
  if (args.priority) update.priority = sanitizeEnum(args.priority, ['low', 'medium', 'high'], 'medium')
  if (typeof args.dueDate === 'string') update.dueDate = new Date(sanitizeDate(args.dueDate))
  await TaskModel.findByIdAndUpdate(task._id, update)
  return { success: true, title: String(task.title), status }
}

async function toolAddTask(args: Record<string, unknown>) {
  const title = sanitizeStr(args.title, 300)
  if (!title) throw new Error('title is required')
  await connectDB()
  const doc = await TaskModel.create({
    title,
    description: sanitizeStr(args.description, 1000) || undefined,
    dueDate:  args.dueDate ? new Date(sanitizeDate(args.dueDate)) : undefined,
    priority: sanitizeEnum(args.priority, ['low', 'medium', 'high'], 'medium'),
    status:   sanitizeEnum(args.status,   ['todo', 'in-progress', 'done'], 'todo'),
    color: '#34d399',
  })
  if (!doc?._id) throw new Error('DB write failed — no document returned')
  return { success: true, title, id: String(doc._id) }
}

async function toolAddReminder(args: Record<string, unknown>) {
  const title = sanitizeStr(args.title, 300)
  if (!title) throw new Error('title is required')
  const reminderDate = new Date(sanitizeDate(args.reminderDate))
  await connectDB()
  const doc = await ReminderModel.create({
    title,
    description: sanitizeStr(args.description, 1000) || undefined,
    reminderDate,
    color: '#fbbf24',
  })
  if (!doc?._id) throw new Error('DB write failed — no document returned')
  scheduleNotification({ id: String(doc._id), type: 'reminder', fireAt: reminderDate })
    .catch(err => console.error('[posthook] reminder schedule error:', err))
  return { success: true, title, id: String(doc._id) }
}

// ─── Tool dispatcher ───────────────────────────────────────────────────────

type Emit = (chunk: StreamChunk) => void

function fetchStepLabel(args: Record<string, unknown>): string {
  const what = Array.isArray(args.what) ? (args.what as string[]).join(', ') : 'data'
  const when = args.when ? ` for ${args.when}` : ''
  return `Fetching your ${what}${when}...`
}

async function executeTool(name: string, args: Record<string, unknown>, emit: Emit, timezone?: string): Promise<unknown> {
  const stepText =
    name === 'fetch_data'          ? fetchStepLabel(args)
    : name === 'check_availability'? `Checking availability...`
    : name === 'add_event'         ? `Adding event: "${args.title}"...`
    : name === 'add_task'          ? `Adding task: "${args.title}"...`
    : name === 'add_reminder'      ? `Setting reminder: "${args.title}"...`
    : name === 'update_task'       ? `Updating task: "${args.title}"...`
    : `Running ${name}...`

  emit({ t: 's', icon: 'search', text: stepText })

  try {
    let result: unknown

    if (name === 'fetch_data') {
      const r = await toolFetchData(args, timezone)
      result = r
      const parts: string[] = []
      if (r.events    && (r.events    as unknown[]).length) parts.push(`${(r.events    as unknown[]).length} event(s)`)
      if (r.tasks     && (r.tasks     as unknown[]).length) parts.push(`${(r.tasks     as unknown[]).length} task(s)`)
      if (r.reminders && (r.reminders as unknown[]).length) parts.push(`${(r.reminders as unknown[]).length} reminder(s)`)
      if (r.notes     && (r.notes     as unknown[]).length) parts.push(`${(r.notes     as unknown[]).length} note(s)`)
      if (r.memories  && (r.memories  as unknown[]).length) {
        const n = (r.memories as unknown[]).length
        parts.push(`${n} memor${n === 1 ? 'y' : 'ies'}`)
      }
      emit({ t: 's', icon: 'found', text: parts.length ? `Found: ${parts.join(', ')}` : 'Nothing found for that query' })

    } else if (name === 'check_availability') {
      const r = await toolCheckAvailability(args)
      result = r
      if (r.available) {
        emit({ t: 's', icon: 'found', text: 'Slot is free — no conflicts!' })
      } else {
        for (const c of r.conflicts ?? [])
          emit({ t: 's', icon: 'clash', text: `Clash: "${c.title}"` })
      }

    } else if (name === 'add_event') {
      result = await toolAddEvent(args)
      emit({ t: 's', icon: 'done', text: 'Event added!' })
      emit({ t: 'refresh' })

    } else if (name === 'add_task') {
      result = await toolAddTask(args)
      emit({ t: 's', icon: 'done', text: 'Task added!' })
      emit({ t: 'refresh' })

    } else if (name === 'add_reminder') {
      result = await toolAddReminder(args)
      emit({ t: 's', icon: 'done', text: 'Reminder set!' })
      emit({ t: 'refresh' })

    } else if (name === 'update_task') {
      result = await toolUpdateTask(args)
      const r = result as Awaited<ReturnType<typeof toolUpdateTask>>
      if (r.success) {
        emit({ t: 's', icon: 'done', text: `Task updated: "${r.title}" → ${r.status}` })
        emit({ t: 'refresh' })
      } else {
        emit({ t: 's', icon: 'warn', text: r.error ?? 'Task not found' })
      }

    } else {
      return { error: `Unknown tool: ${name}` }
    }

    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    emit({ t: 's', icon: 'err', text: `Error in ${name}: ${msg}` })
    return { error: msg }
  }
}

// ─── Agent loop ────────────────────────────────────────────────────────────

const TOOL_CALL_RE = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g

interface ParsedCall { name: string; args: Record<string, unknown> }

/** Try multiple strategies to parse JSON that free models often mangle */
function tryParseJSON(raw: string): Record<string, unknown> | null {
  const attempts = [
    raw,
    // strip trailing commas before } or ]
    raw.replace(/,\s*([}\]])/g, '$1'),
    // extract innermost {...} block in case there's surrounding text
    (raw.match(/\{[\s\S]*\}/) ?? [])[0] ?? '',
  ]
  for (const attempt of attempts) {
    if (!attempt) continue
    try { return JSON.parse(attempt) as Record<string, unknown> } catch { /* try next */ }
  }
  return null
}

function parseCalls(text: string): { calls: ParsedCall[]; parseErrors: number } {
  const calls: ParsedCall[] = []
  let parseErrors = 0
  const re = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const p = tryParseJSON(m[1])
    if (!p) { parseErrors++; console.error('[chat] unparseable tool_call:', m[1].slice(0, 200)); continue }

    // Accept both {"name":"x","args":{}} and {"name":"x","arguments":{}} etc.
    const name = String(p.name ?? p.tool ?? p.function ?? p.action ?? '')
    const args = (p.args ?? p.arguments ?? p.parameters ?? p.input ?? {}) as Record<string, unknown>

    if (name) calls.push({ name, args })
    else { parseErrors++; console.error('[chat] tool_call missing name:', JSON.stringify(p).slice(0, 200)) }
  }
  return { calls, parseErrors }
}

// ─── System prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Laif, a personal productivity assistant embedded in a life-management app.
Current date/time (user's local time): {{LOCAL_DATE}}
User's timezone: {{TIMEZONE}}
Use this timezone when interpreting relative terms like "today", "tomorrow", "this afternoon", and when constructing ISO dates for tool calls.

## YOUR DATA ACCESS

You have ZERO knowledge of the user's schedule, tasks, notes, or memories unless you call fetch_data.
RULE: Whenever the user asks anything about their schedule, plans, tasks, to-dos, reminders, notes, or memories — you MUST call fetch_data BEFORE responding. Never say "I don't have access" — you do, via the tool.

## TOOLS

Call tools using EXACTLY this format (no text before or after the tags on the same line):
<tool_call>
{"name":"TOOL_NAME","args":{...}}
</tool_call>

### fetch_data
Fetch any combination of the user's data.
args:
  "what": array — one or more of: "events", "tasks", "reminders", "notes", "memories"  (use ["events","tasks","reminders"] for schedule questions)
  "when": string (optional) — "today", "tomorrow", "yesterday", or "YYYY-MM-DD"  (omit for all-time)
  "time_from": ISO datetime (optional) — narrow to a time window start
  "time_to":   ISO datetime (optional) — narrow to a time window end

Examples:
  • "How's my schedule today?"       → fetch_data {what:["events","tasks","reminders"], when:"today"}
  • "What do I need to buy?"         → fetch_data {what:["memories"]}  (memories include shopping lists)
  • "What notes do I have?"          → fetch_data {what:["notes"]}
  • "Show me my books to read"       → fetch_data {what:["memories"]}
  • "What's on tomorrow afternoon?"  → fetch_data {what:["events","reminders"], when:"tomorrow"}

### check_availability
Check if a time slot is free before adding an event.
args: {"start":"ISO datetime","end":"ISO datetime"}

### add_event
args: {"title":"str","startDate":"ISO","endDate":"ISO","description":"str (opt)","location":"str (opt)"}
ALWAYS call check_availability first.

### add_task
args: {"title":"str","dueDate":"ISO (opt)","priority":"low|medium|high","status":"todo"}

### add_reminder
args: {"title":"str","reminderDate":"ISO","description":"str (opt)"}

### update_task
Update an existing task's status or priority. Find by title (fuzzy match).
args: {"title":"str","status":"todo|in-progress|done","priority":"low|medium|high (opt)"}
Example: "mark Buy groceries as done" → update_task {"title":"Buy groceries","status":"done"}

## RESPONSE RULES
1. Always call fetch_data first for any question about the user's data.
2. Always call check_availability before add_event. If conflict, tell user and ask to confirm.
3. Before EVERY tool call, write one short friendly sentence explaining what you're about to do. Examples:
   - "Let me pull up your schedule for today."
   - "Sure, checking what you have on tomorrow first."
   - "Let me look at your memories and notes."
   - "I'll check if that time slot is free before adding it."
   Then immediately follow with the <tool_call> block.
4. After all tools return, write a concise friendly response. Format schedule/lists with bullet points.
5. Never expose raw IDs, internal fields, or MongoDB internals.
6. Use ISO 8601 dates. Infer year from today if the user gives a partial date.`

// ─── AI call ───────────────────────────────────────────────────────────────

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
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
      messages,
      max_tokens: 700,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`AI API error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

async function runAgentLoop(
  incomingMessages: { role: string; content: string }[],
  emit: Emit,
  localDate: string,
  timezone: string,
): Promise<void> {
  const system = SYSTEM_PROMPT
    .replace('{{LOCAL_DATE}}', localDate)
    .replace('{{TIMEZONE}}', timezone)
  const msgs: { role: string; content: string }[] = [
    { role: 'system', content: system },
    ...incomingMessages,
  ]

  emit({ t: 's', icon: 'search', text: 'Thinking...' })

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const response = await callAI(msgs)
    const { calls, parseErrors } = parseCalls(response)

    if (calls.length === 0) {
      if (parseErrors > 0) {
        emit({ t: 's', icon: 'warn', text: "Couldn't parse tool call — please try rephrasing." })
      }
      const clean = response.replace(TOOL_CALL_RE, '').trim()
      emit({ t: 'd', text: clean || "Done!" })
      return
    }

    // Emit any conversational text the AI wrote BEFORE the first tool call
    // e.g. "Sure, let me check your schedule for today."
    const firstTagAt = response.indexOf('<tool_call>')
    if (firstTagAt > 0) {
      const preText = response.slice(0, firstTagAt).trim()
      if (preText) emit({ t: 's', icon: 'search', text: preText })
    }

    msgs.push({ role: 'assistant', content: response })

    for (const call of calls) {
      const result = await executeTool(call.name, call.args, emit, timezone)
      msgs.push({
        role: 'user',
        content: `[Tool result: ${call.name}]\n${JSON.stringify(result)}`,
      })
    }
  }

  emit({ t: 'd', text: "I've processed your request. Let me know if you need anything else!" })
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  if (!OPENROUTER_API_KEY) {
    return new Response(
      JSON.stringify({ t: 'err', text: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local' }) + '\n',
      { status: 503, headers: { 'Content-Type': 'application/x-ndjson' } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const rawMessages: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : []
  const clientTimezone  = typeof body.timezone  === 'string' ? body.timezone  : 'UTC'
  const clientLocalDate = typeof body.localDate === 'string' ? body.localDate : new Date().toISOString()

  // Stateless: only send the latest user message — prevents AI from using stale conversation data
  const lastUser = [...rawMessages].reverse().find(m => m.role === 'user')
  const safeMessages = lastUser
    ? [{ role: 'user' as const, content: sanitizeUserMsg(String(lastUser.content)) }]
    : []

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (chunk) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n')) }
        catch { /* stream closed */ }
      }
      try {
        await runAgentLoop(safeMessages, emit, clientLocalDate, clientTimezone)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        emit({ t: 'err', text: `Agent error: ${msg}` })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
