import mongoose, { Schema } from 'mongoose'

export interface IFsNote {
  _id:     string
  name:    string
  parent:  string
  content: string
  date:    string | null
  type:    'note' | 'flow'
}

const FsNoteSchema = new Schema<IFsNote>(
  {
    _id:     { type: String, required: true },
    name:    { type: String, required: true },
    parent:  { type: String, required: true },
    content: { type: String, default: '' },
    date:    { type: String, default: null },
    type:    { type: String, enum: ['note', 'flow'], default: 'note' },
  },
  { timestamps: true }
)

FsNoteSchema.index({ parent: 1 })
FsNoteSchema.index({ parent: 1, date: 1 })

// Force re-registration when schema changes (clears stale cached model in dev)
if (mongoose.models.FsNote) {
  delete (mongoose.models as Record<string, unknown>).FsNote
}

export default mongoose.model<IFsNote>('FsNote', FsNoteSchema)
