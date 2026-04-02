import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import TaskModel from '@/lib/models/Task'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  const body = await req.json()
  const task = await TaskModel.findByIdAndUpdate(params.id, body, { new: true }).lean() as LeanDoc | null
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...task, _id: String(task._id), type: 'task' })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await connectDB()
  await TaskModel.findByIdAndDelete(params.id)
  return NextResponse.json({ success: true })
}
