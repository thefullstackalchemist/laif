'use client'
import { useEffect, useState } from 'react'
import { Heart, Footprints, Moon, Flame, Activity, Droplets } from 'lucide-react'
import Link from 'next/link'

interface TodaySummary {
  heartRate:   number | null
  steps:       number
  sleep:       { durationMinutes: number } | null
  calories:    number
  hrv:         number | null
  restingHR:   number | null
  spo2:        number | null
}

function StatRow({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType; label: string; value: string; color: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p>
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-1)' }}>{value}</p>
      </div>
    </div>
  )
}

function formatSleep(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function HealthSummaryWidget() {
  const [data, setData]   = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health/today')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          Health
        </p>
        <Link href="/health" className="text-xs" style={{ color: 'var(--accent)', opacity: 0.8 }}>
          view all →
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>No data</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-evenly gap-1.5">
          <StatRow icon={Heart}     label="Heart Rate"  value={data.heartRate  != null ? `${data.heartRate} bpm`            : '—'} color="#ef4444" />
          <StatRow icon={Footprints} label="Steps"      value={data.steps > 0  ? data.steps.toLocaleString()                 : '—'} color="#6366f1" />
          <StatRow icon={Moon}      label="Last Sleep"  value={data.sleep      ? formatSleep(data.sleep.durationMinutes)    : '—'} color="#8b5cf6" />
          <StatRow icon={Flame}     label="Calories"    value={data.calories > 0 ? `${data.calories.toLocaleString()} kcal`  : '—'} color="#f97316" />
          {data.hrv      != null && <StatRow icon={Activity}  label="HRV"         value={`${data.hrv} ms`}         color="#10b981" />}
          {data.restingHR != null && <StatRow icon={Heart}    label="Resting HR"  value={`${data.restingHR} bpm`}   color="#f59e0b" />}
          {data.spo2     != null && <StatRow icon={Droplets}  label="SpO2"        value={`${data.spo2}%`}           color="#06b6d4" />}
        </div>
      )}
    </div>
  )
}
