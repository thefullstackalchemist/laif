import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import WebPushSubscription from '@/lib/models/WebPushSubscription'

export async function POST(req: Request) {
  try {
    const { subscription, userAgent } = await req.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await connectDB()
    await WebPushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        endpoint:  subscription.endpoint,
        keys:      subscription.keys,
        userAgent: userAgent ?? '',
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

    await connectDB()
    await WebPushSubscription.deleteOne({ endpoint })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe DELETE]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
