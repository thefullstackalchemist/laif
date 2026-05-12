'use client'
import { useEffect, useState } from 'react'
import {
  Heart, Footprints, Moon, Flame, Activity, Wind,
  Droplets, Scale, Zap, TrendingUp,
} from 'lucide-react'
import { format, parseISO, isToday } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type {
  HeartRateRecord, StepsRecord, SleepRecord, CaloriesRecord,
  HRVRecord, RestingHeartRateRecord, SpO2Record, ExerciseSessionRecord,
  RespiratoryRateRecord, DistanceRecord,
} from '@/types/health'

interface WeightRecord { weightKg: number; time: string; epochSecond: number; source: string; syncedAt: number }

interface HealthData {
  heartRate:       HeartRateRecord[]
  steps:           StepsRecord[]
  sleep:           SleepRecord[]
  calories:        CaloriesRecord[]
  hrv:             HRVRecord[]
  restingHR:       RestingHeartRateRecord[]
  spo2:            SpO2Record[]
  exercises:       ExerciseSessionRecord[]
  weight:          WeightRecord[]
  respiratoryRate: RespiratoryRateRecord[]
  distance:        DistanceRecord[]
}

// ── Shared chart theme ────────────────────────────────────────────────────────

const GRID  = 'rgba(255,255,255,0.05)'
const TICK  = { fontSize: 10, fill: 'var(--text-3)' }
const TIP   = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 11, color: 'var(--text-1)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }
function groupByDay<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  items.forEach(i => { const k = getKey(i); (out[k] ??= []).push(i) })
  return out
}

// ── Layout ────────────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, color, stat, children }: {
  title: string; icon: React.ElementType; color: string; stat?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h2>
        </div>
        {stat && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{stat}</span>}
      </div>
      {children}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{value}</span>
    </div>
  )
}

function Empty() {
  return <p className="text-xs text-center py-8" style={{ color: 'var(--text-3)' }}>No data</p>
}

// ── Heart Rate ────────────────────────────────────────────────────────────────

function HeartRateSection({ data }: { data: HeartRateRecord[] }) {
  const today    = data.filter(r => isToday(parseISO(r.time)))
  const bpms     = today.map(r => r.beatsPerMinute)
  const avgBpm   = bpms.length ? Math.round(avg(bpms)) : null
  const minBpm   = bpms.length ? Math.min(...bpms) : null
  const maxBpm   = bpms.length ? Math.max(...bpms) : null

  // Daily averages for 7-day trend
  const byDay  = groupByDay(data, r => format(parseISO(r.time), 'MM/dd'))
  const trend  = Object.entries(byDay).map(([date, recs]) => ({
    date, bpm: Math.round(avg(recs.map(r => r.beatsPerMinute))),
  }))

  const points = today.map(r => ({ t: format(parseISO(r.time), 'HH:mm'), bpm: r.beatsPerMinute }))

  return (
    <SectionCard title="Heart Rate" icon={Heart} color="#ef4444" stat={avgBpm ? `${avgBpm} bpm avg` : undefined}>
      {avgBpm && (
        <div className="flex gap-2 mb-4">
          <StatPill label="Avg" value={`${avgBpm} bpm`} />
          <StatPill label="Min" value={`${minBpm} bpm`} />
          <StatPill label="Max" value={`${maxBpm} bpm`} />
        </div>
      )}
      <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Today</p>
      {points.length ? (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" tick={TICK} interval="preserveStartEnd" />
            <YAxis tick={TICK} domain={['auto', 'auto']} />
            <Tooltip contentStyle={TIP} formatter={v => [`${v} bpm`, 'Heart Rate']} />
            <Area type="monotone" dataKey="bpm" stroke="#ef4444" strokeWidth={1.5} fill="url(#hrGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : <div style={{ height: 140 }}><Empty /></div>}
      {trend.length > 1 && (
        <>
          <p className="text-xs mt-4 mb-1" style={{ color: 'var(--text-3)' }}>7-day daily average</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="date" tick={TICK} />
              <YAxis tick={TICK} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TIP} formatter={v => [`${v} bpm`, 'Avg HR']} />
              <Line type="monotone" dataKey="bpm" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </SectionCard>
  )
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

function SleepSection({ data }: { data: SleepRecord[] }) {
  const byNight: Record<string, number> = {}
  data.forEach(r => {
    const k = format(parseISO(r.startTime), 'MM/dd')
    byNight[k] = Math.max(byNight[k] ?? 0, r.durationMinutes)
  })
  const points = Object.entries(byNight).map(([date, mins]) => ({ date, hours: +(mins / 60).toFixed(1) }))
  const avgH = points.length ? +(avg(points.map(p => p.hours))).toFixed(1) : null

  return (
    <SectionCard title="Sleep — last 14 nights" icon={Moon} color="#8b5cf6" stat={avgH ? `${avgH}h avg` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis tick={TICK} domain={[0, 10]} unit="h" />
            <Tooltip contentStyle={TIP} formatter={v => [`${v}h`, 'Sleep']} />
            <ReferenceLine y={8} stroke="#8b5cf6" strokeDasharray="4 3" strokeOpacity={0.4} />
            <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function StepsSection({ data, distance }: { data: StepsRecord[]; distance: DistanceRecord[] }) {
  const byDay: Record<string, number> = {}
  data.forEach(r => { const k = format(parseISO(r.startTime), 'MM/dd'); byDay[k] = (byDay[k] ?? 0) + r.count })
  const distByDay: Record<string, number> = {}
  distance.forEach(r => { const k = format(parseISO(r.startTime), 'MM/dd'); distByDay[k] = (distByDay[k] ?? 0) + r.distanceMeters })

  const points = Object.entries(byDay).map(([date, count]) => ({
    date, count, km: distByDay[date] ? +(distByDay[date] / 1000).toFixed(2) : 0,
  }))
  const todayKey = format(new Date(), 'MM/dd')
  const todaySteps = byDay[todayKey] ?? 0

  return (
    <SectionCard title="Steps — last 7 days" icon={Footprints} color="#6366f1" stat={todaySteps > 0 ? `${todaySteps.toLocaleString()} today` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={points} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TIP} formatter={(v, n) => [n === 'count' ? (v as number).toLocaleString() : `${v} km`, n === 'count' ? 'Steps' : 'Distance']} />
            <ReferenceLine y={10000} stroke="#6366f1" strokeDasharray="4 3" strokeOpacity={0.4} />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Calories ──────────────────────────────────────────────────────────────────

function CaloriesSection({ data }: { data: CaloriesRecord[] }) {
  const byDay: Record<string, number> = {}
  data.forEach(r => { const k = format(parseISO(r.startTime), 'MM/dd'); byDay[k] = (byDay[k] ?? 0) + r.calories })
  const points = Object.entries(byDay).map(([date, cal]) => ({ date, cal: Math.round(cal) }))
  const todayKey = format(new Date(), 'MM/dd')
  const todayCal = byDay[todayKey] ? Math.round(byDay[todayKey]) : 0

  return (
    <SectionCard title="Calories — last 7 days" icon={Flame} color="#f59e0b" stat={todayCal > 0 ? `${todayCal.toLocaleString()} today` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={points} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip contentStyle={TIP} formatter={v => [`${(v as number).toLocaleString()} kcal`, 'Calories']} />
            <Bar dataKey="cal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── HRV ───────────────────────────────────────────────────────────────────────

function HRVSection({ data }: { data: HRVRecord[] }) {
  const byDay = groupByDay(data, r => format(parseISO(r.time), 'MM/dd'))
  const points = Object.entries(byDay).map(([date, recs]) => ({
    date, rmssd: Math.round(avg(recs.map(r => r.rmssd))),
  }))
  const latest = points[points.length - 1]?.rmssd

  return (
    <SectionCard title="HRV — last 30 days" icon={Activity} color="#10b981" stat={latest ? `${latest} ms latest` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis tick={TICK} unit="ms" />
            <Tooltip contentStyle={TIP} formatter={v => [`${v} ms`, 'HRV']} />
            <Line type="monotone" dataKey="rmssd" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Resting HR ────────────────────────────────────────────────────────────────

function RestingHRSection({ data }: { data: RestingHeartRateRecord[] }) {
  const points = data.map(r => ({ date: format(parseISO(r.time), 'MM/dd'), bpm: r.beatsPerMinute }))
  const latest = points[points.length - 1]?.bpm

  return (
    <SectionCard title="Resting HR — last 30 days" icon={Wind} color="#f97316" stat={latest ? `${latest} bpm latest` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis tick={TICK} domain={['auto', 'auto']} />
            <Tooltip contentStyle={TIP} formatter={v => [`${v} bpm`, 'Resting HR']} />
            <Line type="monotone" dataKey="bpm" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── SpO2 ──────────────────────────────────────────────────────────────────────

function SpO2Section({ data }: { data: SpO2Record[] }) {
  const points = data.map(r => ({ t: format(parseISO(r.time), 'MM/dd HH:mm'), pct: +r.percentage.toFixed(1) }))
  const latest = points[points.length - 1]?.pct

  return (
    <SectionCard title="SpO2 — last 7 days" icon={Droplets} color="#06b6d4" stat={latest ? `${latest}%` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="t" tick={TICK} interval="preserveStartEnd" />
            <YAxis tick={TICK} domain={[90, 100]} unit="%" />
            <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Tooltip contentStyle={TIP} formatter={v => [`${v}%`, 'SpO2']} />
            <Area type="monotone" dataKey="pct" stroke="#06b6d4" strokeWidth={1.5} fill="url(#spo2Grad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Weight ────────────────────────────────────────────────────────────────────

function WeightSection({ data }: { data: WeightRecord[] }) {
  const points = data.map(r => ({ date: format(parseISO(r.time), 'MM/dd'), kg: +r.weightKg.toFixed(1) }))
  const latest = points[points.length - 1]?.kg
  const first  = points[0]?.kg
  const delta  = latest && first ? +(latest - first).toFixed(1) : null

  return (
    <SectionCard title="Weight — last 90 days" icon={Scale} color="#a78bfa"
      stat={latest ? `${latest} kg` : undefined}>
      {delta !== null && (
        <p className="text-xs mb-3" style={{ color: delta < 0 ? '#10b981' : delta > 0 ? '#f97316' : 'var(--text-3)' }}>
          {delta > 0 ? '+' : ''}{delta} kg over period
        </p>
      )}
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} interval="preserveStartEnd" />
            <YAxis tick={TICK} domain={['auto', 'auto']} unit=" kg" />
            <Tooltip contentStyle={TIP} formatter={v => [`${v} kg`, 'Weight']} />
            <Line type="monotone" dataKey="kg" stroke="#a78bfa" strokeWidth={2} dot={{ r: 2, fill: '#a78bfa' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Respiratory Rate ──────────────────────────────────────────────────────────

function RespiratorySection({ data }: { data: RespiratoryRateRecord[] }) {
  const byDay = groupByDay(data, r => format(parseISO(r.time), 'MM/dd'))
  const points = Object.entries(byDay).map(([date, recs]) => ({
    date, rate: +avg(recs.map(r => r.rate)).toFixed(1),
  }))
  const latest = points[points.length - 1]?.rate

  return (
    <SectionCard title="Respiratory Rate — last 7 days" icon={Zap} color="#64748b" stat={latest ? `${latest} brpm` : undefined}>
      {points.length ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tick={TICK} />
            <YAxis tick={TICK} domain={['auto', 'auto']} />
            <Tooltip contentStyle={TIP} formatter={v => [`${v} brpm`, 'Resp. Rate']} />
            <Line type="monotone" dataKey="rate" stroke="#64748b" strokeWidth={2} dot={{ r: 3, fill: '#64748b' }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Workouts ──────────────────────────────────────────────────────────────────

const EXERCISE_LABELS: Record<number, string> = {
  0: 'Other', 2: 'Biking', 4: 'Boxing', 8: 'Calisthenics',
  11: 'Elliptical', 20: 'HIIT', 21: 'Hiking', 31: 'Pilates',
  38: 'Running', 39: 'Running (Treadmill)', 42: 'Stair Climbing',
  51: 'Strength Training', 52: 'Stretching', 54: 'Swimming (Open Water)',
  55: 'Swimming (Pool)', 57: 'Tennis', 59: 'Walking', 61: 'Weightlifting', 63: 'Yoga',
}

function WorkoutsSection({ data }: { data: ExerciseSessionRecord[] }) {
  return (
    <SectionCard title="Recent Workouts — last 30 days" icon={TrendingUp} color="#6366f1" stat={data.length > 0 ? `${data.length} sessions` : undefined}>
      {data.length ? (
        <div className="flex flex-col gap-2">
          {[...data].reverse().slice(0, 10).map((ex, i) => {
            const label = ex.title || EXERCISE_LABELS[ex.exerciseType] || 'Workout'
            const start = parseISO(ex.startTime)
            const end   = parseISO(ex.endTime)
            const durationMin = Math.round((end.getTime() - start.getTime()) / 60000)
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#6366f120' }}>
                  <Activity size={14} style={{ color: '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {format(start, 'MMM d')} · {durationMin}min
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : <Empty />}
    </SectionCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [data, setData]       = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { if (d.error) setError(true); else setData(d) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="flex items-center gap-2.5 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <Heart size={16} style={{ color: '#ef4444' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Health</span>
        {loading && (
          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin ml-1"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        )}
      </div>

      <div className="flex-1 overflow-auto p-5" style={{ minHeight: 0 }}>
        {error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Failed to load health data.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
            <div id="heart-rate" style={{ scrollMarginTop: 16 }}><HeartRateSection  data={data?.heartRate  ?? []} /></div>
            <div id="sleep"      style={{ scrollMarginTop: 16 }}><SleepSection      data={data?.sleep      ?? []} /></div>
            <div id="steps"      style={{ scrollMarginTop: 16 }}><StepsSection      data={data?.steps      ?? []} distance={data?.distance ?? []} /></div>
            <div id="calories"   style={{ scrollMarginTop: 16 }}><CaloriesSection   data={data?.calories   ?? []} /></div>
            <div id="hrv"        style={{ scrollMarginTop: 16 }}><HRVSection        data={data?.hrv        ?? []} /></div>
            <div id="resting-hr" style={{ scrollMarginTop: 16 }}><RestingHRSection  data={data?.restingHR  ?? []} /></div>
            <div id="spo2"       style={{ scrollMarginTop: 16 }}><SpO2Section       data={data?.spo2       ?? []} /></div>
            {(data?.weight ?? []).length > 0 && (
              <div id="weight"   style={{ scrollMarginTop: 16 }}><WeightSection     data={data!.weight}          /></div>
            )}
            {(data?.respiratoryRate ?? []).length > 0 && (
              <div               style={{ scrollMarginTop: 16 }}><RespiratorySection data={data!.respiratoryRate} /></div>
            )}
            <div id="workouts" style={{ gridColumn: '1 / -1', scrollMarginTop: 16 }}>
              <WorkoutsSection data={data?.exercises ?? []} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
