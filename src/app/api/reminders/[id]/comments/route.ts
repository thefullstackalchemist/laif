import ReminderModel from '@/lib/models/Reminder'
import { addComment } from '@/lib/addComment'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { text } = await req.json()
  return addComment(ReminderModel, params.id, text)
}
