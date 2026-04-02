// Support both POSTHOOK_API_KEY and POSTHOOK_API env var names
const POSTHOOK_API_KEY = process.env.POSTHOOK_API_KEY ?? process.env.POSTHOOK_API
const POSTHOOK_ENDPOINT = 'https://api.posthook.io/v1/hooks'

export type SchedulableType = 'event' | 'reminder' | 'task'

interface ScheduleOptions {
  id: string
  type: SchedulableType
  fireAt: Date
  minutesBefore?: number
}

export async function scheduleNotification({ id, type, fireAt, minutesBefore = 0 }: ScheduleOptions) {
  console.log(`[posthook] scheduleNotification called — ${type}:${id} fireAt=${fireAt.toISOString()} minutesBefore=${minutesBefore}`)

  if (!POSTHOOK_API_KEY) {
    console.error('[posthook] ❌ Neither POSTHOOK_API_KEY nor POSTHOOK_API env var is set — skipping')
    return null
  }

  const triggerTime = new Date(fireAt.getTime() - minutesBefore * 60 * 1000)

  if (triggerTime <= new Date()) {
    console.warn(`[posthook] ⏭ Trigger time ${triggerTime.toISOString()} is in the past for ${type}:${id} — skipping`)
    return null
  }

  const payload = {
    path: '/api/posthook_listener',
    postAt: triggerTime.toISOString(),
    data: { type, id },
  }
  console.log('[posthook] Sending to PostHook:', JSON.stringify(payload))

  const res = await fetch(POSTHOOK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': POSTHOOK_API_KEY,
    },
    body: JSON.stringify(payload),
  })

  const responseText = await res.text()
  if (!res.ok) {
    console.error(`[posthook] ❌ PostHook API error (${res.status}) for ${type}:${id} — ${responseText}`)
    return null
  }

  try {
    const json = JSON.parse(responseText)
    console.log(`[posthook] ✅ Scheduled ${type}:${id} at ${triggerTime.toISOString()} — response: ${JSON.stringify(json)}`)
    return json
  } catch {
    console.log(`[posthook] ✅ Scheduled ${type}:${id} — raw response: ${responseText}`)
    return responseText
  }
}
