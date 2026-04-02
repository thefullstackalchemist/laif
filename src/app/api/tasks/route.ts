import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import TaskModel from '@/lib/models/Task'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function GET() {
  await connectDB()
  const tasks = await TaskModel.find().sort({ createdAt: -1 }).lean() as LeanDoc[]
  return NextResponse.json(tasks.map(t => ({ ...t, _id: String(t._id), type: 'task' })))
}

export async function POST(req: Request) {
  await connectDB()
  const body = await req.json()
  const task = await TaskModel.create(body)
  const plain = task.toObject() as LeanDoc
  return NextResponse.json({ ...plain, _id: String(plain._id), type: 'task' }, { status: 201 })
}
