import { NextResponse } from 'next/server'
import { rtdb } from '@/lib/firebase-admin'

/**
 * GET /api/test-notification?type=reminder
 * Writes a fake notification directly to RTDB — shows up in the browser
 * toast within 20 s (or instantly on next poll / tab focus).
 *
 * Query params:
 *   type  = event | task | reminder   (default: reminder)
 *   title = custom title              (optional)
 *   body  = custom body               (optional)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type  = searchParams.get('type')  || 'reminder'
  const title = searchParams.get('title') || DEFAULT_TITLE[type] || '🔔 Test notification'
  const body  = searchParams.get('body')  || DEFAULT_BODY[type]  || 'This is a test'

  const ref = rtdb().ref('web-notifications').push()
  await ref.set({
    title,
    body,
    type,
    itemId:    'test',
    createdAt: Date.now(),
    read:      false,
  })

  return NextResponse.json({
    ok:   true,
    key:  ref.key,
    type,
    title,
    body,
    note: 'Notification written to RTDB. Should appear in browser within 20 s or immediately on tab focus.',
  })
}

const DEFAULT_TITLE: Record<string, string> = {
  event:    '📅 Upcoming event',
  task:     '✅ Task due',
  reminder: '🔔 Reminder',
}
const DEFAULT_BODY: Record<string, string> = {
  event:    '"Team standup" starts in 15 minutes',
  task:     '"Submit report" is due now',
  reminder: '"Call the bank" — time to act',
}
