import mongoose, { Schema, Document } from 'mongoose'

export interface IJournalEntry extends Document {
  date:      string   // 'YYYY-MM-DD' — unique per day
  content:   string   // Tiptap JSON string
  updatedAt: Date
  createdAt: Date
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    date:    { type: String, required: true, unique: true, index: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.JournalEntry
  || mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema)
