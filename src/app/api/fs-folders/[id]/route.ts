import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import NoteFolder from '@/lib/models/NoteFolder'
import FsNote from '@/lib/models/FsNote'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Protect built-in folders
  if (id === 'root' || id === 'journal') {
    return NextResponse.json({ error: 'Cannot delete built-in folder' }, { status: 403 })
  }
  await connectDB()
  // Recursively delete children folders and their notes
  async function deleteFolder(folderId: string) {
    const children = await NoteFolder.find({ parent: folderId }).lean()
    for (const child of children) await deleteFolder(String(child._id))
    await FsNote.deleteMany({ parent: folderId })
    await NoteFolder.findByIdAndDelete(folderId)
  }
  await deleteFolder(id)
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await connectDB()
  const body = await req.json()
  const folder = await NoteFolder.findByIdAndUpdate(id, body, { new: true }).lean()
  if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(folder)
}
