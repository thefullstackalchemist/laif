'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Phone, Mail, Building2, MapPin, Tag, X, Trash2, Copy, Check } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { Contact } from '@/types'
import type { CalView } from '@/components/calendar/CalendarView'

const ACCENT = 'var(--accent)'

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const ROLE_COLORS: Record<string, string> = {
  electrician: '#f59e0b', plumber: '#06b6d4', cleaner: '#34d399',
  neighbour: '#a78bfa', isp: '#3b82f6', doctor: '#f43f5e',
  contractor: '#fb923c', default: '#94a3b8',
}

function roleColor(role?: string): string {
  if (!role) return ROLE_COLORS.default
  const key = role.toLowerCase()
  return Object.entries(ROLE_COLORS).find(([k]) => key.includes(k))?.[1] ?? ROLE_COLORS.default
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

interface ContactFormProps {
  initial?: Partial<Contact>
  onSave: (data: Omit<Contact, '_id' | 'createdAt'>) => Promise<void>
  onClose: () => void
}

function ContactForm({ initial, onSave, onClose }: ContactFormProps) {
  const [name,    setName]    = useState(initial?.name    ?? '')
  const [role,    setRole]    = useState(initial?.role    ?? '')
  const [phone,   setPhone]   = useState(initial?.phone   ?? '')
  const [email,   setEmail]   = useState(initial?.email   ?? '')
  const [company, setCompany] = useState(initial?.company ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes,   setNotes]   = useState(initial?.notes   ?? '')
  const [tags,    setTags]    = useState((initial?.tags ?? []).join(', '))
  const [saving,  setSaving]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name:    name.trim(),
        role:    role.trim()    || undefined,
        phone:   phone.trim()   || undefined,
        email:   email.trim()   || undefined,
        company: company.trim() || undefined,
        address: address.trim() || undefined,
        notes:   notes.trim()   || undefined,
        tags:    tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; required?: boolean; placeholder?: string }) => (
    <div>
      <label className="label">{label}{opts?.required && ' *'}</label>
      <input
        type={opts?.type ?? 'text'}
        className="input-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={opts?.placeholder}
        required={opts?.required}
      />
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="glass-card p-6 w-full max-w-md"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>
            {initial ? 'Edit contact' : 'New contact'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {field('Name', name, setName, { required: true, placeholder: 'John Smith' })}
          {field('Role / How you know them', role, setRole, { placeholder: 'Electrician, Neighbour, ISP Helper…' })}
          {field('Phone', phone, setPhone, { type: 'tel', placeholder: '+1 555 0123' })}
          {field('Email', email, setEmail, { type: 'email', placeholder: 'john@example.com' })}
          {field('Company', company, setCompany, { placeholder: 'Acme Corp' })}
          {field('Address', address, setAddress, { placeholder: '123 Main St' })}
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any extra info…"
            />
          </div>
          {field('Tags', tags, setTags, { placeholder: 'home, urgent (comma-separated)' })}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 py-2">Cancel</button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="btn-primary flex-1 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Add contact'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Contact card ─────────────────────────────────────────────────────────────

function ContactCard({ contact, onDelete, onEdit }: {
  contact: Contact
  onDelete: (id: string) => void
  onEdit: (c: Contact) => void
}) {
  const [copied, setCopied] = useState(false)

  function copyPhone() {
    if (!contact.phone) return
    navigator.clipboard.writeText(contact.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const rc = roleColor(contact.role)
  const bg = `${rc}18`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-4 flex flex-col gap-3 cursor-pointer group"
      onClick={() => onEdit(contact)}
      style={{ minHeight: 140 }}
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: bg, color: rc }}
        >
          {initials(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{contact.name}</p>
          {contact.role && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-medium inline-block mt-0.5"
              style={{ background: bg, color: rc }}
            >
              {contact.role}
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(contact._id!) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost p-1"
          style={{ color: 'var(--text-3)' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span className="text-xs truncate flex-1" style={{ color: 'var(--text-2)' }}>{contact.phone}</span>
            <button
              onClick={e => { e.stopPropagation(); copyPhone() }}
              className="flex-shrink-0 transition-colors"
              style={{ color: copied ? '#34d399' : 'var(--text-3)' }}
              title="Copy number"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{contact.email}</span>
          </div>
        )}
        {contact.company && (
          <div className="flex items-center gap-2">
            <Building2 size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{contact.company}</span>
          </div>
        )}
        {contact.address && (
          <div className="flex items-center gap-2">
            <MapPin size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{contact.address}</span>
          </div>
        )}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={10} style={{ color: 'var(--text-3)' }} />
            {contact.tags.map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'var(--input-bg)', color: 'var(--text-3)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const { refetch: refetchItems } = useItems()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [calView, setCalView] = useState<CalView>('month')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) setContacts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-open contact from ?id= param (e.g. navigated from chat)
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || contacts.length === 0) return
    const found = contacts.find(c => c._id === id)
    if (found) {
      setEditing(found)
      router.replace('/contacts') // clean up URL
    }
  }, [searchParams, contacts, router])

  async function handleAdd(data: Omit<Contact, '_id' | 'createdAt'>) {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created = await res.json()
      setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setShowForm(false)
    }
  }

  async function handleEdit(data: Omit<Contact, '_id' | 'createdAt'>) {
    if (!editing?._id) return
    const res = await fetch(`/api/contacts/${editing._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setContacts(prev => prev.map(c => c._id === updated._id ? updated : c).sort((a, b) => a.name.localeCompare(b.name)))
      setEditing(null)
    }
  }

  async function handleDelete(id: string) {
    setContacts(prev => prev.filter(c => c._id !== id))
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q) ||
      c.phone?.includes(q) || c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)
  })

  // Group alphabetically
  const grouped = filtered.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.name[0].toUpperCase()
    ;(acc[letter] ??= []).push(c)
    return acc
  }, {})

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        currentView={calView}
        onViewChange={setCalView}
        counts={{ events: 0, tasks: 0, reminders: 0 }}
        onAddItem={() => {}}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: ACCENT }}>
            <Users size={18} />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Contacts</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{contacts.length} saved</p>
          </div>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 py-2 px-3 text-xs">
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-6 py-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              className="input-field pl-8 text-sm"
              placeholder="Search by name, role, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!loading && contacts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-48 gap-3"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                <Users size={28} style={{ color: ACCENT }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>No contacts yet</p>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-3)' }}>
                Add people you want to keep handy — electricians, neighbours, ISP helpers, doctors…
              </p>
            </motion.div>
          )}

          {Object.keys(grouped).sort().map(letter => (
            <section key={letter} className="mb-6">
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-3)' }}>{letter}</p>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                <AnimatePresence>
                  {grouped[letter].map(c => (
                    <ContactCard
                      key={c._id}
                      contact={c}
                      onDelete={handleDelete}
                      onEdit={setEditing}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {(showForm || editing) && (
          <ContactForm
            initial={editing ?? undefined}
            onSave={editing ? handleEdit : handleAdd}
            onClose={() => { setShowForm(false); setEditing(null) }}
          />
        )}
      </AnimatePresence>

      <FloatingChat onRefreshItems={refetchItems} />
    </div>
  )
}
