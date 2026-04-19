import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import NoteFolder from '@/lib/models/NoteFolder'
import { v4 as uuidv4 } from 'uuid'

// Seed root + journal folders if they don't exist
async function seed() {
  const root = await NoteFolder.findById('root')
  if (!root) {
    await NoteFolder.create({ _id: 'root', name: 'pim-notes', parent: null })
  }
  const journal = await NoteFolder.findById('journal')
  if (!journal) {
    await NoteFolder.create({ _id: 'journal', name: 'Journal', parent: 'root' })
  }
}

export async function GET() {
  await connectDB()
  await seed()
  const folders = await NoteFolder.find().lean()
  return NextResponse.json(folders)
}

export async function POST(req: Request) {
  await connectDB()
  await seed()
  const body = await req.json()
  const folder = await NoteFolder.create({ _id: uuidv4(), ...body })
  return NextResponse.json(folder.toObject(), { status: 201 })
}
