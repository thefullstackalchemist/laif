import mongoose, { Schema, models } from 'mongoose'

const TaskSchema = new Schema({
  type: { type: String, default: 'task' },
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  color: { type: String, default: '#34d399' },
  comments: [{ text: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true })

export default models.Task || mongoose.model('Task', TaskSchema)
