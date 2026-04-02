import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MemoryModel from '@/lib/models/Memory'
import { MEMORY_TYPES, type MemoryType } from '@/types'

type LeanDoc = Record<string, unknown> & { _id: unknown }

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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  const body = await req.json().catch(() => ({}))

  const update: Record<string, unknown> = {}
  if (typeof body.title === 'string') update.title = sanitizeStr(body.title, 300)
  if (typeof body.description === 'string') update.description = sanitizeStr(body.description, 1000)
  if (body.attributes) update.attributes = sanitizeAttrs(body.attributes)
  if (typeof body.status === 'string') update.status = sanitizeStr(body.status, 50)
  if (MEMORY_TYPES.includes(body.type as MemoryType)) update.type = body.type
  if (['low','medium','high'].includes(body.priority)) update.priority = body.priority
  if (Array.isArray(body.tags)) update.tags = (body.tags as unknown[]).filter(t => typeof t === 'string').map(String).slice(0, 20)

  const updated = await MemoryModel.findByIdAndUpdate(params.id, update, { new: true }).lean() as LeanDoc | null
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...updated, _id: String(updated._id) })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await MemoryModel.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
