import mongoose, { Schema, models } from 'mongoose'

const HolidaySchema = new Schema({
  name: { type: String, required: true, trim: true },
  date: { type: String, required: true }, // "MM-DD" for annual
}, { timestamps: true })

export default models.Holiday || mongoose.model('Holiday', HolidaySchema)
