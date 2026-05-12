'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Sun, Cake } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Holiday, Birthday } from '@/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const THIS_YEAR = new Date().getFullYear()

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ── Holiday date picker: year + month + day → YYYY-MM-DD ─────────────────────

function HolidayDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value ? value.split('-') : [`${THIS_YEAR}`, '01', '01']
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])

  function set(year: number, month: number, day: number) {
    const maxDay = daysInMonth(year, month)
    onChange([
      String(year),
      String(month).padStart(2, '0'),
      String(Math.min(day, maxDay)).padStart(2, '0'),
    ].join('-'))
  }

  const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1)

  return (
    <div className="flex gap-2">
      <select
        value={y}
        onChange={e => set(Number(e.target.value), m, d)}
        className="w-24 text-xs rounded-lg px-2 py-1.5 outline-none"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
      >
        {[THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1].map(yr => (
          <option key={yr} value={yr}>{yr}</option>
        ))}
      </select>
      <select
        value={m}
        onChange={e => set(y, Number(e.target.value), d)}
        className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
      >
        {MONTHS.map((name, i) => (
          <option key={i} value={i + 1}>{name}</option>
        ))}
      </select>
      <select
        value={d}
        onChange={e => set(y, m, Number(e.target.value))}
        className="w-16 text-xs rounded-lg px-2 py-1.5 outline-none"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
      >
        {days.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  )
}

// ── Birthday date picker: optional year + month + day ────────────────────────
// Stores "MM-DD" (annual) or "YYYY-MM-DD" (with birth year)

function BirthdayDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts   = value ? value.split('-') : []
  const hasYear = parts.length === 3
  const y  = hasYear ? Number(parts[0]) : THIS_YEAR
  const mm = hasYear ? Number(parts[1]) : (Number(parts[0]) || 1)
  const dd = hasYear ? Number(parts[2]) : (Number(parts[1]) || 1)

  function emit(year: number | null, month: number, day: number) {
    const maxDay = daysInMonth(year ?? THIS_YEAR, month)
    const safeDay = Math.min(day, maxDay)
    if (year !== null) {
      onChange(`${year}-${String(month).padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`)
    } else {
      onChange(`${String(month).padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`)
    }
  }

  function toggleYear(checked: boolean) {
    emit(checked ? THIS_YEAR : null, mm, dd)
  }

  const days = Array.from({ length: daysInMonth(y, mm) }, (_, i) => i + 1)
  const yearRange = Array.from({ length: THIS_YEAR - 1900 + 2 }, (_, i) => 1900 + i).reverse()

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {hasYear && (
          <select
            value={y}
            onChange={e => emit(Number(e.target.value), mm, dd)}
            className="w-24 text-xs rounded-lg px-2 py-1.5 outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
          >
            {yearRange.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
        )}
        <select
          value={mm}
          onChange={e => emit(hasYear ? y : null, Number(e.target.value), dd)}
          className="flex-1 text-xs rounded-lg px-2 py-1.5 outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
        >
          {MONTHS.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
        </select>
        <select
          value={dd}
          onChange={e => emit(hasYear ? y : null, mm, Number(e.target.value))}
          className="w-16 text-xs rounded-lg px-2 py-1.5 outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
        >
          {days.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox" checked={hasYear} onChange={e => toggleYear(e.target.checked)}
          className="rounded"
        />
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Include birth year</span>
      </label>
    </div>
  )
}

// ── Add forms ─────────────────────────────────────────────────────────────────

function AddHolidayForm({ onAdd }: { onAdd: (name: string, date: string) => Promise<void> }) {
  const [name, setName]   = useState('')
  const [date, setDate]   = useState(`${THIS_YEAR}-01-01`)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setSaving(true)
    await onAdd(name.trim(), date)
    setName('')
    setDate(`${THIS_YEAR}-01-01`)
    setSaving(false)
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <input
        autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Holiday name…"
        className="w-full text-sm bg-transparent outline-none" style={{ color: 'var(--text-1)' }}
      />
      <HolidayDatePicker value={date} onChange={setDate} />
      <button
        onClick={submit} disabled={!name.trim() || saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 hover:opacity-80"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        <Plus size={11} /> Add
      </button>
    </div>
  )
}

function AddBirthdayForm({ onAdd }: { onAdd: (name: string, date: string) => Promise<void> }) {
  const [name, setName]   = useState('')
  const [date, setDate]   = useState('01-01')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setSaving(true)
    await onAdd(name.trim(), date)
    setName('')
    setDate('01-01')
    setSaving(false)
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <input
        autoFocus value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder="Person's name…"
        className="w-full text-sm bg-transparent outline-none" style={{ color: 'var(--text-1)' }}
      />
      <BirthdayDatePicker value={date} onChange={setDate} />
      <button
        onClick={submit} disabled={!name.trim() || saving}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 hover:opacity-80"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        <Plus size={11} /> Add
      </button>
    </div>
  )
}

// ── Holidays section ──────────────────────────────────────────────────────────

function formatHolidayDate(date: string): string {
  // YYYY-MM-DD
  const [y, mm, dd] = date.split('-')
  return `${MONTHS[Number(mm) - 1]} ${Number(dd)}, ${y}`
}

function HolidaysSection({
  allHolidays, onAdd, onDelete,
}: {
  allHolidays: Holiday[]
  onAdd: (name: string, date: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [showForm, setShowForm]   = useState(false)
  const [year, setYear]           = useState(THIS_YEAR)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const yearHolidays = allHolidays.filter(h => h.date.startsWith(`${year}-`))
  const hasThisYear  = allHolidays.some(h => h.date.startsWith(`${THIS_YEAR}-`))

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <Sun size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Holidays</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Shown with amber border in month calendar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Year switcher */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button onClick={() => setYear(y => y - 1)}
              className="px-2 py-1 text-xs hover:opacity-70 transition-opacity"
              style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>‹</button>
            <span className="px-2 text-xs font-mono" style={{ color: 'var(--text-1)', background: 'var(--input-bg)' }}>{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="px-2 py-1 text-xs hover:opacity-70 transition-opacity"
              style={{ background: 'var(--input-bg)', color: 'var(--text-2)' }}>›</button>
          </div>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:opacity-80"
            style={{ background: '#f59e0b', color: '#fff' }}
          >
            {showForm ? <X size={11} /> : <Plus size={11} />}
            {showForm ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3"
          >
            <AddHolidayForm onAdd={async (name, date) => { await onAdd(name, date); setShowForm(false) }} />
          </motion.div>
        )}
      </AnimatePresence>

      {yearHolidays.length === 0 && !showForm ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-2)' }}>
            No holidays for {year}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {!hasThisYear && year === THIS_YEAR
              ? 'Add holidays for this year to see them in the calendar.'
              : 'Hit "Add" to mark a holiday for this year.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {yearHolidays.map(item => (
              <motion.div
                key={item._id} layout
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>{item.name}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{formatHolidayDate(item.date)}</span>
                {confirmId === item._id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { onDelete(item._id!); setConfirmId(null) }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: '#ef444420', color: '#ef4444' }}>Delete</button>
                    <button onClick={() => setConfirmId(null)} className="p-1 rounded-lg hover:opacity-60" style={{ color: 'var(--text-3)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(item._id!)}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                    style={{ color: 'var(--text-3)' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

// ── Birthdays section ─────────────────────────────────────────────────────────

function BirthdaysSection({
  birthdays, onAdd, onDelete,
}: {
  birthdays: Birthday[]
  onAdd: (name: string, date: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [showForm, setShowForm]   = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function formatDate(date: string): string {
    const parts = date.split('-')
    if (parts.length === 3) {
      const [y, mm, dd] = parts.map(Number)
      return `${MONTHS[mm - 1]} ${dd}, ${y}`
    }
    const [mm, dd] = parts.map(Number)
    return `${MONTHS[mm - 1]} ${dd}`
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#ec489920', color: '#ec4899' }}>
            <Cake size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Birthdays</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Annual — shown with a cake icon in the month calendar.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:opacity-80"
          style={{ background: '#ec4899', color: '#fff' }}
        >
          {showForm ? <X size={11} /> : <Plus size={11} />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3"
          >
            <AddBirthdayForm onAdd={async (name, date) => { await onAdd(name, date); setShowForm(false) }} />
          </motion.div>
        )}
      </AnimatePresence>

      {birthdays.length === 0 && !showForm ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>None added yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {birthdays.map(item => (
              <motion.div
                key={item._id} layout
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ec4899' }} />
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>{item.name}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{formatDate(item.date)}</span>
                {confirmId === item._id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { onDelete(item._id!); setConfirmId(null) }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: '#ef444420', color: '#ef4444' }}>Delete</button>
                    <button onClick={() => setConfirmId(null)} className="p-1 rounded-lg hover:opacity-60" style={{ color: 'var(--text-3)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(item._id!)}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                    style={{ color: 'var(--text-3)' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function CalendarSettings() {
  const [holidays,  setHolidays]  = useState<Holiday[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])

  useEffect(() => {
    fetch('/api/holidays').then(r => r.json()).then(setHolidays).catch(() => {})
    fetch('/api/birthdays').then(r => r.json()).then(setBirthdays).catch(() => {})
  }, [])

  async function addHoliday(name: string, date: string) {
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date }),
    })
    if (res.ok) { const doc = await res.json(); setHolidays(prev => [...prev, doc]) }
  }

  async function addBirthday(name: string, date: string) {
    const res = await fetch('/api/birthdays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date }),
    })
    if (res.ok) { const doc = await res.json(); setBirthdays(prev => [...prev, doc]) }
  }

  return (
    <div>
      <HolidaysSection
        allHolidays={holidays}
        onAdd={addHoliday}
        onDelete={id => { setHolidays(prev => prev.filter(h => h._id !== id)); fetch(`/api/holidays/${id}`, { method: 'DELETE' }) }}
      />
      <BirthdaysSection
        birthdays={birthdays}
        onAdd={addBirthday}
        onDelete={id => { setBirthdays(prev => prev.filter(b => b._id !== id)); fetch(`/api/birthdays/${id}`, { method: 'DELETE' }) }}
      />
    </div>
  )
}
