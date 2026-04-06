import mongoose, { Schema, models } from 'mongoose'

// Stores Web Push API subscriptions from browsers
const WebPushSubscriptionSchema = new Schema({
  endpoint:  { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
}, { timestamps: true })

export default models.WebPushSubscription
  || mongoose.model('WebPushSubscription', WebPushSubscriptionSchema)
