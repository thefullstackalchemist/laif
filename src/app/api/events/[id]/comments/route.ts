import EventModel from '@/lib/models/Event'
import { addComment } from '@/lib/addComment'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { text } = await req.json()
  return addComment(EventModel, params.id, text)
}
