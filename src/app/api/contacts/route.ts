import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ContactModel from '@/lib/models/Contact'

export async function GET() {
  await connectDB()
  const contacts = await ContactModel.find({}).sort({ name: 1 }).lean()
  return NextResponse.json(contacts)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, role, phone, email, company, address, notes, tags } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  await connectDB()
  const contact = await ContactModel.create({
    name:    name.trim(),
    role:    role?.trim()    || undefined,
    phone:   phone?.trim()   || undefined,
    email:   email?.trim()   || undefined,
    company: company?.trim() || undefined,
    address: address?.trim() || undefined,
    notes:   notes?.trim()   || undefined,
    tags:    Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : [],
  })

  return NextResponse.json(contact, { status: 201 })
}
