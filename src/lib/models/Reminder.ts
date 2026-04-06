import mongoose, { Schema, models } from 'mongoose'

const ReminderSchema = new Schema({
  type: { type: String, default: 'reminder' },
  title: { type: String, required: true },
  description: String,
  reminderDate: { type: Date, required: true },
  notified: { type: Boolean, default: false },
  color: { type: String, default: '#fbbf24' },
  posthookId: { type: String, default: null },
  comments: [{ text: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true })

export default models.Reminder || mongoose.model('Reminder', ReminderSchema)
