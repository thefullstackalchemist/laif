import TaskModel from '@/lib/models/Task'
import { addComment } from '@/lib/addComment'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { text } = await req.json()
  return addComment(TaskModel, params.id, text)
}
