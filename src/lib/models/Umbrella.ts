import mongoose, { Schema, models } from 'mongoose'

const UmbrellaSchema = new Schema({
  name:  { type: String, required: true },
  color: { type: String, required: true },
}, { timestamps: true })

export default models.Umbrella || mongoose.model('Umbrella', UmbrellaSchema)
