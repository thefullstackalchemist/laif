import { NextResponse } from 'next/server'
import { scheduleNotification } from '@/lib/posthook'

// GET /api/test-posthook
// Schedules a test hook 2 minutes from now and returns the result.
// DELETE THIS FILE after debugging.
export async function GET() {
  const fireAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now

  const envKey = process.env.POSTHOOK_API_KEY ?? process.env.POSTHOOK_API

  try {
    const result = await scheduleNotification({
      id:   'test-123',
      type: 'reminder',
      fireAt,
    })
    return NextResponse.json({
      ok: !!result,
      result,
      envKeyFound: !!envKey,
      envKeyPrefix: envKey ? envKey.slice(0, 6) + '...' : null,
      fireAt: fireAt.toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      envKeyFound: !!envKey,
      envKeyPrefix: envKey ? envKey.slice(0, 6) + '...' : null,
    }, { status: 500 })
  }
}
