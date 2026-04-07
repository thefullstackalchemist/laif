import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import UmbrellaModel from '@/lib/models/Umbrella'

type LeanDoc = Record<string, unknown> & { _id: unknown }

export async function GET() {
  await connectDB()
  const umbrellas = await UmbrellaModel.find().sort({ createdAt: 1 }).lean() as LeanDoc[]
  return NextResponse.json(umbrellas.map(u => ({ ...u, _id: String(u._id) })))
}

export async function POST(req: Request) {
  await connectDB()
  const { name, color } = await req.json()
  if (!name?.trim() || !color) return NextResponse.json({ error: 'name and color required' }, { status: 400 })
  const doc = await UmbrellaModel.create({ name: name.trim(), color })
  const plain = doc.toObject() as LeanDoc
  return NextResponse.json({ ...plain, _id: String(plain._id) }, { status: 201 })
}
