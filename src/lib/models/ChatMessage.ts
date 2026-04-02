import mongoose, { Schema, models } from 'mongoose'

const StepSchema = new Schema({
  id:   { type: String, required: true },
  icon: { type: String, required: true },
  text: { type: String, required: true },
}, { _id: false })

// One document per message — enables direct querying by role, date, content, etc.
const ChatMessageSchema = new Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, default: '' },
  steps:   { type: [StepSchema], default: [] },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true })

ChatMessageSchema.index({ timestamp: 1 })
ChatMessageSchema.index({ role: 1 })

export default models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema)
