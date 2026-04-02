import mongoose, { Schema, models } from 'mongoose'
import { MEMORY_TYPES } from '@/types'

const MemorySchema = new Schema({
  type:        { type: String, enum: MEMORY_TYPES, required: true },
  title:       { type: String, required: true },
  description: String,
  attributes:  { type: Object, default: {} },
  status:      String,
  priority:    { type: String, enum: ['low', 'medium', 'high'] },
  tags:        [String],
  linkedTaskId: String,
}, { timestamps: true })

export default models.Memory || mongoose.model('Memory', MemorySchema)
