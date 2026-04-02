import mongoose, { Schema, models } from 'mongoose'

const EventSchema = new Schema({
  type: { type: String, default: 'event' },
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
  location: String,
  color: { type: String, default: '#5b8ded' },
}, { timestamps: true })

export default models.Event || mongoose.model('Event', EventSchema)
