import { NextRequest } from 'next/server'

const API_KEY = process.env.PUBLIC_AUTH_SECRET ?? ''

async function callApi(host: string, method: string, path: string, body?: unknown) {
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const res = await fetch(`${protocol}://${host}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

const TOOLS = [
  {
    name: 'list_tasks',
    description: 'List all tasks. Returns title, status, priority, dueDate, description.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_task',
    description: 'Create a new task.',
    inputSchema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Task title' },
        description: { type: 'string' },
        priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
        status:      { type: 'string', enum: ['todo', 'in-progress', 'done'] },
        dueDate:     { type: 'string', description: 'ISO 8601 datetime' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update a task by ID. Only pass fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'Task _id' },
        title:       { type: 'string' },
        description: { type: 'string' },
        priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
        status:      { type: 'string', enum: ['todo', 'in-progress', 'done'] },
        dueDate:     { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Permanently delete a task by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Task _id' } },
      required: ['id'],
    },
  },
  {
    name: 'list_events',
    description: 'List all calendar events sorted by start date.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_event',
    description: 'Create a calendar event.',
    inputSchema: {
      type: 'object',
      properties: {
        title:       { type: 'string' },
        startDate:   { type: 'string', description: 'ISO 8601 datetime' },
        endDate:     { type: 'string', description: 'ISO 8601 datetime' },
        description: { type: 'string' },
        location:    { type: 'string' },
        allDay:      { type: 'boolean' },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },
  {
    name: 'update_event',
    description: 'Update a calendar event by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'Event _id' },
        title:       { type: 'string' },
        startDate:   { type: 'string' },
        endDate:     { type: 'string' },
        description: { type: 'string' },
        location:    { type: 'string' },
        allDay:      { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete a calendar event by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Event _id' } },
      required: ['id'],
    },
  },
  {
    name: 'list_reminders',
    description: 'List all reminders sorted by date.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_reminder',
    description: 'Create a reminder that fires at a specific date and time.',
    inputSchema: {
      type: 'object',
      properties: {
        title:        { type: 'string' },
        reminderDate: { type: 'string', description: 'ISO 8601 datetime' },
        description:  { type: 'string' },
      },
      required: ['title', 'reminderDate'],
    },
  },
  {
    name: 'delete_reminder',
    description: 'Delete a reminder by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Reminder _id' } },
      required: ['id'],
    },
  },
  {
    name: 'list_notes',
    description: 'List notes. Optionally filter by parent folder ID.',
    inputSchema: {
      type: 'object',
      properties: { parent: { type: 'string', description: 'Folder ID. Omit for all.' } },
      required: [],
    },
  },
  {
    name: 'get_note',
    description: 'Get a single note with its full content by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Note _id' } },
      required: ['id'],
    },
  },
  {
    name: 'create_note',
    description: 'Create a new note inside a folder.',
    inputSchema: {
      type: 'object',
      properties: {
        name:    { type: 'string', description: 'Note title' },
        parent:  { type: 'string', description: 'Parent folder ID. Use "root" for top-level.' },
        content: { type: 'string' },
      },
      required: ['name', 'parent'],
    },
  },
  {
    name: 'update_note',
    description: "Update a note's content or name.",
    inputSchema: {
      type: 'object',
      properties: {
        id:      { type: 'string', description: 'Note _id' },
        name:    { type: 'string' },
        content: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Note _id' } },
      required: ['id'],
    },
  },
  {
    name: 'pkms_list_fs',
    description: 'List the entire PKMS file system as a tree. Returns all folders and note names (no content). Use this first to orient yourself.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'pkms_open_folder',
    description: 'Open a folder and list its direct contents — child folders and note names (no content). Equivalent to `cd <folder> && ls`.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_id: { type: 'string', description: 'Folder _id. Use "root" for the top-level folder.' },
      },
      required: ['folder_id'],
    },
  },
  {
    name: 'pkms_read_note',
    description: 'Read a note by name within a folder. Returns full content (TipTap JSON). Equivalent to `cat <filename>`.',
    inputSchema: {
      type: 'object',
      properties: {
        name:      { type: 'string', description: 'Note name / title to find' },
        folder_id: { type: 'string', description: 'Parent folder _id to search within' },
      },
      required: ['name', 'folder_id'],
    },
  },
  {
    name: 'list_memories',
    description: 'List all captured memories.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_memory',
    description: 'Capture a new memory from natural-language text.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'e.g. "Read Atomic Habits by James Clear"' },
      },
      required: ['text'],
    },
  },
  {
    name: 'update_memory',
    description: 'Update memory status or fields.',
    inputSchema: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'Memory _id' },
        status:      { type: 'string', description: 'e.g. want, doing, done' },
        priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
        tags:        { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_memory',
    description: 'Delete a memory by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Memory _id' } },
      required: ['id'],
    },
  },
  {
    name: 'list_journal_dates',
    description: 'Return all dates (YYYY-MM-DD) that have a journal entry.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_journal',
    description: 'Read a journal entry for a specific date.',
    inputSchema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['date'],
    },
  },
  {
    name: 'write_journal',
    description: 'Write or overwrite a journal entry for a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        date:    { type: 'string', description: 'YYYY-MM-DD' },
        content: { type: 'string' },
      },
      required: ['date', 'content'],
    },
  },
]

async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  host: string,
): Promise<unknown> {
  const { id, ...rest } = args as Record<string, unknown> & { id?: string }

  switch (name) {
    // Tasks
    case 'list_tasks':    return callApi(host, 'GET', '/api/tasks')
    case 'create_task':   return callApi(host, 'POST', '/api/tasks', args)
    case 'update_task':   return callApi(host, 'PUT', `/api/tasks/${id}`, rest)
    case 'delete_task':   return callApi(host, 'DELETE', `/api/tasks/${id}`)
    // Events
    case 'list_events':   return callApi(host, 'GET', '/api/events')
    case 'create_event':  return callApi(host, 'POST', '/api/events', args)
    case 'update_event':  return callApi(host, 'PUT', `/api/events/${id}`, rest)
    case 'delete_event':  return callApi(host, 'DELETE', `/api/events/${id}`)
    // Reminders
    case 'list_reminders':  return callApi(host, 'GET', '/api/reminders')
    case 'create_reminder': return callApi(host, 'POST', '/api/reminders', args)
    case 'delete_reminder': return callApi(host, 'DELETE', `/api/reminders/${id}`)
    // Notes
    case 'list_notes': {
      const qs = args.parent ? `?parent=${encodeURIComponent(args.parent as string)}` : ''
      return callApi(host, 'GET', `/api/fs-notes${qs}`)
    }
    case 'get_note':    return callApi(host, 'GET', `/api/fs-notes/${id}`)
    case 'create_note': return callApi(host, 'POST', '/api/fs-notes', args)
    case 'update_note': return callApi(host, 'PUT', `/api/fs-notes/${id}`, rest)
    case 'delete_note': return callApi(host, 'DELETE', `/api/fs-notes/${id}`)
    // PKMS navigation
    case 'pkms_list_fs': {
      const [folders, notes] = await Promise.all([
        callApi(host, 'GET', '/api/fs-folders') as Promise<Array<{ _id: string; name: string; parent: string | null }>>,
        callApi(host, 'GET', '/api/fs-notes')   as Promise<Array<{ _id: string; name: string; parent: string; type: string }>>,
      ])
      const tree: Record<string, unknown> = {}
      for (const f of folders) {
        tree[f._id] = { folder: { _id: f._id, name: f.name }, subfolders: [] as typeof folders, notes: [] as typeof notes }
      }
      for (const f of folders) {
        if (f.parent && (tree[f.parent] as { subfolders: typeof folders } | undefined)) {
          (tree[f.parent] as { subfolders: typeof folders }).subfolders.push(f)
        }
      }
      for (const n of notes) {
        if (tree[n.parent]) {
          (tree[n.parent] as { notes: typeof notes }).notes.push({ _id: n._id, name: n.name, parent: n.parent, type: n.type })
        }
      }
      return tree
    }
    case 'pkms_open_folder': {
      const folderId = args.folder_id as string
      const [folders, notes] = await Promise.all([
        callApi(host, 'GET', '/api/fs-folders') as Promise<Array<{ _id: string; name: string; parent: string | null }>>,
        callApi(host, 'GET', `/api/fs-notes?parent=${encodeURIComponent(folderId)}`) as Promise<Array<{ _id: string; name: string; type: string }>>,
      ])
      return {
        folder_id: folderId,
        subfolders: folders.filter(f => f.parent === folderId),
        notes: notes.map(n => ({ _id: n._id, name: n.name, type: n.type })),
      }
    }
    case 'pkms_read_note': {
      const noteName = args.name as string
      const folderId = args.folder_id as string
      const notes = await callApi(host, 'GET', `/api/fs-notes?parent=${encodeURIComponent(folderId)}`) as Array<{ _id: string; name: string }>
      const match = notes.find(n => n.name.toLowerCase() === noteName.toLowerCase())
      if (!match) return { error: `Note "${noteName}" not found in folder "${folderId}"` }
      return callApi(host, 'GET', `/api/fs-notes/${match._id}`)
    }
    // Memories
    case 'list_memories':  return callApi(host, 'GET', '/api/memories')
    case 'create_memory':  return callApi(host, 'POST', '/api/memories', args)
    case 'update_memory':  return callApi(host, 'PUT', `/api/memories/${id}`, rest)
    case 'delete_memory':  return callApi(host, 'DELETE', `/api/memories/${id}`)
    // Journal
    case 'list_journal_dates': return callApi(host, 'GET', '/api/journal')
    case 'get_journal': return callApi(host, 'GET', `/api/journal?date=${args.date}`)
    case 'write_journal': return callApi(host, 'PUT', '/api/journal', args)

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, method, params } = body as {
    id?: string | number
    method: string
    params?: Record<string, unknown>
  }
  const host = req.headers.get('host') ?? 'laifx.vercel.app'

  // Notifications (no id) — just acknowledge
  if (id === undefined || id === null) {
    return new Response(null, { status: 202 })
  }

  try {
    let result: unknown

    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'pim', version: '1.0.0' },
      }
    } else if (method === 'ping') {
      result = {}
    } else if (method === 'tools/list') {
      result = { tools: TOOLS }
    } else if (method === 'tools/call') {
      const { name, arguments: toolArgs } = params as {
        name: string
        arguments?: Record<string, unknown>
      }
      const data = await handleToolCall(name, toolArgs ?? {}, host)
      result = {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      }
    } else {
      return Response.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      })
    }

    return Response.json({ jsonrpc: '2.0', id, result })
  } catch (err) {
    return Response.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: String(err) },
    })
  }
}

// Some MCP clients do a GET to check if the endpoint is alive
export async function GET() {
  return Response.json({ name: 'pim', version: '1.0.0', protocol: 'MCP/2024-11-05' })
}
