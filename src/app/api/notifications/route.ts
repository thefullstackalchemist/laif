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

/**
 * GET /api/notifications?since=<ms timestamp>
 *
 * Returns all notifications created AFTER `since`.
 * Each client tracks its own `since` in localStorage — no global
 * read-state, so multiple browser sessions don't steal from each other.
 *
 * Old entries (>24 h) are cleaned up to keep RTDB tidy.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const since = Number(searchParams.get('since') ?? 0)

  try {
    const ref  = rtdb().ref('web-notifications')
    const snap = await ref.orderByChild('createdAt').startAfter(since).once('value')

    const notifications: WebNotification[] = []
    if (snap.exists()) {
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
    }

    // Prune entries older than 24 h (fire-and-forget)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    rtdb().ref('web-notifications')
      .orderByChild('createdAt').endBefore(cutoff)
      .once('value')
      .then(old => {
        if (!old.exists()) return
        const del: Record<string, null> = {}
        old.forEach(c => { del[c.key!] = null })
        rtdb().ref('web-notifications').update(del)
      })
      .catch(() => {})

    return NextResponse.json({ notifications })
  } catch (err) {
    console.error('[notifications] RTDB read error:', err)
    return NextResponse.json({ notifications: [] })
  }
}
