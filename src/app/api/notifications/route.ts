import { NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase-admin'

export interface WebNotification {
  key: string
  title: string
  body: string
  type: string
  itemId: string
  createdAt: number
}

export async function GET() {
  try {
    const ref = rtdb().ref('web-notifications')
    const snap = await ref.orderByChild('read').equalTo(false).once('value')

    if (!snap.exists()) return NextResponse.json({ notifications: [] })

    const notifications: WebNotification[] = []
    snap.forEach(child => {
      const v = child.val()
      notifications.push({
        key:       child.key!,
        title:     v.title     ?? '',
        body:      v.body      ?? '',
        type:      v.type      ?? '',
        itemId:    v.itemId    ?? '',
        createdAt: v.createdAt ?? 0,
      })
    })

    // Mark all as read in one update
    if (notifications.length) {
      const updates: Record<string, boolean> = {}
      notifications.forEach(n => { updates[`${n.key}/read`] = true })
      await ref.update(updates)
    }

    return NextResponse.json({ notifications })
  } catch (err) {
    console.error('[notifications] RTDB read error:', err)
    return NextResponse.json({ notifications: [] })
  }
}
