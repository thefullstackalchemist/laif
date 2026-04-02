import mongoose, { Schema, models } from 'mongoose'

const StepSchema = new Schema({
  id:   { type: String, required: true },
  icon: { type: String, required: true },
  text: { type: String, required: true },
}, { _id: false })

const MessageSchema = new Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, default: '' },
  steps:     { type: [StepSchema], default: [] },
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

// Single conversation per user — we always upsert the same singleton doc
const ConversationSchema = new Schema({
  messages: { type: [MessageSchema], default: [] },
}, { timestamps: true })

export default models.Conversation || mongoose.model('Conversation', ConversationSchema)
