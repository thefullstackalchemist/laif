import Posthook from '@posthook/node'

const apiKey = process.env.POSTHOOK_API_KEY ?? process.env.POSTHOOK_API
const posthook = apiKey ? new Posthook(apiKey, { timeout: 8000 }) : null

export type SchedulableType = 'event' | 'reminder' | 'task'

interface ScheduleOptions {
  id: string
  type: SchedulableType
  fireAt: Date
  minutesBefore?: number
}

export async function scheduleNotification({ id, type, fireAt, minutesBefore = 0 }: ScheduleOptions) {
  console.log(`[posthook] scheduleNotification called — ${type}:${id} fireAt=${fireAt.toISOString()} minutesBefore=${minutesBefore}`)

  if (!posthook) {
    console.error('[posthook] ❌ Neither POSTHOOK_API_KEY nor POSTHOOK_API env var is set — skipping')
    return null
  }

  const triggerTime = new Date(fireAt.getTime() - minutesBefore * 60 * 1000)

  if (triggerTime <= new Date()) {
    console.warn(`[posthook] ⏭ Trigger time ${triggerTime.toISOString()} is in the past for ${type}:${id} — skipping`)
    return null
  }

  try {
    const hook = await posthook.hooks.schedule({
      path: '/api/posthook_listener',
      postAt: triggerTime.toISOString(),
      data: { type, id },
    })
    console.log(`[posthook] ✅ Scheduled ${type}:${id} at ${triggerTime.toISOString()} — hook:`, JSON.stringify(hook))
    return hook
  } catch (err) {
    console.error(`[posthook] ❌ Failed to schedule ${type}:${id} —`, err)
    return null
  }
}
