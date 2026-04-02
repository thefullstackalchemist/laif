const POSTHOOK_API_KEY = process.env.POSTHOOK_API_KEY
const BASE_URL = 'https://laix.vercel.app'
const POSTHOOK_API = 'https://api.posthook.io/v1/hooks'

export type SchedulableType = 'event' | 'reminder' | 'task'

interface ScheduleOptions {
  id: string
  type: SchedulableType
  fireAt: Date          // exact UTC time to trigger the webhook
  minutesBefore?: number // optional offset — fire N minutes before fireAt
}

/**
 * Register a PostHook job. PostHook will POST to /api/posthook_listener
 * at the scheduled time with { type, id } in the payload.
 */
export async function scheduleNotification({ id, type, fireAt, minutesBefore = 0 }: ScheduleOptions) {
  if (!POSTHOOK_API_KEY) {
    console.warn('[posthook] POSTHOOK_API_KEY not set — skipping schedule')
    return null
  }

  const triggerTime = new Date(fireAt.getTime() - minutesBefore * 60 * 1000)

  // Don't schedule in the past
  if (triggerTime <= new Date()) {
    console.warn(`[posthook] Trigger time is in the past for ${type}:${id} — skipping`)
    return null
  }

  const res = await fetch(POSTHOOK_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': POSTHOOK_API_KEY,
    },
    body: JSON.stringify({
      path: `${BASE_URL}/api/posthook_listener`,
      postAt: triggerTime.toISOString(),
      data: { type, id },
    }),
  })

  if (!res.ok) {
    console.error(`[posthook] Failed to schedule ${type}:${id} —`, await res.text())
    return null
  }

  const json = await res.json()
  console.log(`[posthook] Scheduled ${type}:${id} at ${triggerTime.toISOString()} — hook id: ${json.id ?? json.hookId}`)
  return json
}
