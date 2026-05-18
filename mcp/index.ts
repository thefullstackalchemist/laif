import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const BASE    = process.env.PIM_BASE_URL ?? 'https://laifx.vercel.app'
const API_KEY = process.env.PUBLIC_AUTH_SECRET ?? ''

if (!API_KEY) {
  process.stderr.write('ERROR: PUBLIC_AUTH_SECRET is not set\n')
  process.exit(1)
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'pim',
  version: '1.0.0',
})

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'list_tasks',
  'List all tasks. Returns title, status, priority, dueDate, description.',
  {},
  async () => ok(await api('GET', '/api/tasks')),
)

server.tool(
  'create_task',
  'Create a new task.',
  {
    title:       z.string().describe('Task title'),
    description: z.string().optional().describe('Optional detail'),
    priority:    z.enum(['low', 'medium', 'high']).optional().default('medium'),
    status:      z.enum(['todo', 'in-progress', 'done']).optional().default('todo'),
    dueDate:     z.string().optional().describe('ISO 8601 datetime, e.g. 2026-05-20T09:00:00'),
  },
  async (args) => ok(await api('POST', '/api/tasks', args)),
)

server.tool(
  'update_task',
  'Update a task by ID. Only pass fields you want to change.',
  {
    id:          z.string().describe('Task _id'),
    title:       z.string().optional(),
    description: z.string().optional(),
    priority:    z.enum(['low', 'medium', 'high']).optional(),
    status:      z.enum(['todo', 'in-progress', 'done']).optional(),
    dueDate:     z.string().optional().describe('ISO 8601 datetime or empty string to clear'),
  },
  async ({ id, ...patch }) => ok(await api('PUT', `/api/tasks/${id}`, patch)),
)

server.tool(
  'delete_task',
  'Permanently delete a task by ID.',
  { id: z.string().describe('Task _id') },
  async ({ id }) => ok(await api('DELETE', `/api/tasks/${id}`)),
)

// ══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'list_events',
  'List all calendar events sorted by start date.',
  {},
  async () => ok(await api('GET', '/api/events')),
)

server.tool(
  'create_event',
  'Create a calendar event.',
  {
    title:       z.string().describe('Event title'),
    startDate:   z.string().describe('ISO 8601 datetime'),
    endDate:     z.string().describe('ISO 8601 datetime'),
    description: z.string().optional(),
    location:    z.string().optional(),
    allDay:      z.boolean().optional().default(false),
  },
  async (args) => ok(await api('POST', '/api/events', args)),
)

server.tool(
  'update_event',
  'Update a calendar event by ID.',
  {
    id:          z.string().describe('Event _id'),
    title:       z.string().optional(),
    startDate:   z.string().optional().describe('ISO 8601 datetime'),
    endDate:     z.string().optional().describe('ISO 8601 datetime'),
    description: z.string().optional(),
    location:    z.string().optional(),
    allDay:      z.boolean().optional(),
  },
  async ({ id, ...patch }) => ok(await api('PUT', `/api/events/${id}`, patch)),
)

server.tool(
  'delete_event',
  'Delete a calendar event by ID.',
  { id: z.string().describe('Event _id') },
  async ({ id }) => ok(await api('DELETE', `/api/events/${id}`)),
)

// ══════════════════════════════════════════════════════════════════════════════
// REMINDERS
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'list_reminders',
  'List all reminders sorted by date. Past reminders are already fired.',
  {},
  async () => ok(await api('GET', '/api/reminders')),
)

server.tool(
  'create_reminder',
  'Create a reminder that fires at a specific date and time.',
  {
    title:        z.string().describe('What to be reminded about'),
    reminderDate: z.string().describe('ISO 8601 datetime when to fire, e.g. 2026-05-20T08:00:00'),
    description:  z.string().optional(),
  },
  async (args) => ok(await api('POST', '/api/reminders', args)),
)

server.tool(
  'delete_reminder',
  'Delete a reminder by ID.',
  { id: z.string().describe('Reminder _id') },
  async ({ id }) => ok(await api('DELETE', `/api/reminders/${id}`)),
)

// ══════════════════════════════════════════════════════════════════════════════
// NOTES  (structured fs-notes with folders)
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'list_notes',
  'List notes. Optionally filter by parent folder ID.',
  {
    parent: z.string().optional().describe('Folder ID to filter by. Omit for all notes.'),
  },
  async ({ parent }) => {
    const qs = parent ? `?parent=${encodeURIComponent(parent)}` : ''
    return ok(await api('GET', `/api/fs-notes${qs}`))
  },
)

server.tool(
  'get_note',
  'Get a single note with its full content by ID.',
  { id: z.string().describe('Note _id') },
  async ({ id }) => ok(await api('GET', `/api/fs-notes/${id}`)),
)

server.tool(
  'create_note',
  'Create a new note inside a folder.',
  {
    name:    z.string().describe('Note title / filename'),
    parent:  z.string().describe('Parent folder ID. Use "root" for top-level.'),
    content: z.string().optional().describe('Note content (plain text or markdown)'),
  },
  async (args) => ok(await api('POST', '/api/fs-notes', args)),
)

server.tool(
  'update_note',
  'Update a note\'s content or name.',
  {
    id:      z.string().describe('Note _id'),
    name:    z.string().optional(),
    content: z.string().optional(),
  },
  async ({ id, ...patch }) => ok(await api('PUT', `/api/fs-notes/${id}`, patch)),
)

server.tool(
  'delete_note',
  'Delete a note by ID.',
  { id: z.string().describe('Note _id') },
  async ({ id }) => ok(await api('DELETE', `/api/fs-notes/${id}`)),
)

// ══════════════════════════════════════════════════════════════════════════════
// PKMS  (file-system navigation over fs-folders + fs-notes)
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'pkms_list_fs',
  'List the entire PKMS file system as a tree. Returns all folders and note names (no content). Use this first to orient yourself.',
  {},
  async () => {
    const [folders, notes] = await Promise.all([
      api('GET', '/api/fs-folders') as Promise<Array<{ _id: string; name: string; parent: string | null }>>,
      api('GET', '/api/fs-notes')   as Promise<Array<{ _id: string; name: string; parent: string; type: string }>>,
    ])

    // Build tree: folder → { subfolders, notes }
    const tree: Record<string, { folder: { _id: string; name: string }; subfolders: typeof folders; notes: typeof notes }> = {}
    for (const f of folders) {
      tree[f._id] = { folder: { _id: f._id, name: f.name }, subfolders: [], notes: [] }
    }
    for (const f of folders) {
      if (f.parent && tree[f.parent]) tree[f.parent].subfolders.push(f)
    }
    for (const n of notes) {
      if (tree[n.parent]) tree[n.parent].notes.push({ _id: n._id, name: n.name, parent: n.parent, type: n.type })
    }

    return ok(tree)
  },
)

server.tool(
  'pkms_open_folder',
  'Open a folder and list its direct contents — child folders and note names (no content). Equivalent to `cd <folder> && ls`.',
  {
    folder_id: z.string().describe('Folder _id. Use "root" for the top-level folder.'),
  },
  async ({ folder_id }) => {
    const [folders, notes] = await Promise.all([
      api('GET', '/api/fs-folders') as Promise<Array<{ _id: string; name: string; parent: string | null }>>,
      api('GET', `/api/fs-notes?parent=${encodeURIComponent(folder_id)}`) as Promise<Array<{ _id: string; name: string; type: string }>>,
    ])
    const subfolders = folders.filter(f => f.parent === folder_id)
    return ok({
      folder_id,
      subfolders,
      notes: notes.map(n => ({ _id: n._id, name: n.name, type: n.type })),
    })
  },
)

server.tool(
  'pkms_read_note',
  'Read a note by name within a folder. Returns full content (TipTap JSON). Equivalent to `cat <filename>`.',
  {
    name:      z.string().describe('Note name / title to find'),
    folder_id: z.string().describe('Parent folder _id to search within'),
  },
  async ({ name, folder_id }) => {
    const notes = await api('GET', `/api/fs-notes?parent=${encodeURIComponent(folder_id)}`) as Array<{ _id: string; name: string }>
    const match = notes.find(n => n.name.toLowerCase() === name.toLowerCase())
    if (!match) return ok({ error: `Note "${name}" not found in folder "${folder_id}"` })
    return ok(await api('GET', `/api/fs-notes/${match._id}`))
  },
)

server.tool(
  'pkms_write_note',
  'Write content to a note found by name within a folder. Equivalent to `echo ... > <filename>`. Overwrites existing content.',
  {
    name:      z.string().describe('Note name / title to find'),
    folder_id: z.string().describe('Parent folder _id to search within'),
    content:   z.string().describe('New content to write (plain text or TipTap JSON)'),
  },
  async ({ name, folder_id, content }) => {
    const notes = await api('GET', `/api/fs-notes?parent=${encodeURIComponent(folder_id)}`) as Array<{ _id: string; name: string }>
    const match = notes.find(n => n.name.toLowerCase() === name.toLowerCase())
    if (!match) return ok({ error: `Note "${name}" not found in folder "${folder_id}"` })
    return ok(await api('PUT', `/api/fs-notes/${match._id}`, { content }))
  },
)

server.tool(
  'pkms_create_folder',
  'Create a new folder inside a parent folder. Equivalent to `mkdir <name>`.',
  {
    name:      z.string().describe('Folder name'),
    parent_id: z.string().describe('Parent folder _id. Use "root" for top-level.'),
  },
  async ({ name, parent_id }) => ok(await api('POST', '/api/fs-folders', { name, parent: parent_id })),
)

// ══════════════════════════════════════════════════════════════════════════════
// MEMORIES
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'list_memories',
  'List all captured memories. Types: book, movie, song, contact, shopping, task, place, quote, link, general.',
  {},
  async () => ok(await api('GET', '/api/memories')),
)

server.tool(
  'create_memory',
  'Capture a new memory. The API will auto-classify type if you pass raw text via the text field.',
  {
    text: z.string().describe(
      'Raw natural-language text to capture, e.g. "Read Atomic Habits by James Clear". ' +
      'The server will auto-parse type, title, and description.',
    ),
  },
  async (args) => ok(await api('POST', '/api/memories', args)),
)

server.tool(
  'update_memory',
  'Update memory status or fields.',
  {
    id:          z.string().describe('Memory _id'),
    status:      z.string().optional().describe('e.g. want, doing, done'),
    priority:    z.enum(['low', 'medium', 'high']).optional(),
    tags:        z.array(z.string()).optional(),
    description: z.string().optional(),
  },
  async ({ id, ...patch }) => ok(await api('PUT', `/api/memories/${id}`, patch)),
)

server.tool(
  'delete_memory',
  'Delete a memory by ID.',
  { id: z.string().describe('Memory _id') },
  async ({ id }) => ok(await api('DELETE', `/api/memories/${id}`)),
)

// ══════════════════════════════════════════════════════════════════════════════
// JOURNAL
// ══════════════════════════════════════════════════════════════════════════════

server.tool(
  'list_journal_dates',
  'Return all dates (YYYY-MM-DD) that have a journal entry.',
  {},
  async () => ok(await api('GET', '/api/journal')),
)

server.tool(
  'get_journal',
  'Read a journal entry for a specific date.',
  {
    date: z.string().describe('Date in YYYY-MM-DD format, e.g. 2026-05-14'),
  },
  async ({ date }) => ok(await api('GET', `/api/journal?date=${date}`)),
)

server.tool(
  'write_journal',
  'Write or append to a journal entry for a specific date. ' +
  'Overwrites the entry if one already exists for that date.',
  {
    date:    z.string().describe('Date in YYYY-MM-DD format'),
    content: z.string().describe('Journal content (plain text)'),
  },
  async (args) => ok(await api('PUT', '/api/journal', args)),
)

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
process.stderr.write(`PIM MCP server running — connected to ${BASE}\n`)
