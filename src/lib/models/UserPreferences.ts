import mongoose, { Schema, models } from 'mongoose'

// Singleton preference store — one doc per key (e.g. 'rss')
const UserPreferencesSchema = new Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export default models.UserPreferences || mongoose.model('UserPreferences', UserPreferencesSchema)
