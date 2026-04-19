'use client'
import { useState, useEffect, useCallback } from 'react'
import type { AnyItem, CalendarEvent, Task, Reminder } from '@/types'

export function useItems() {
  const [items, setItems] = useState<AnyItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [events, tasks, reminders] = await Promise.all([
        fetch('/api/events').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/reminders').then(r => r.json()),
      ])
      setItems([...events, ...tasks, ...reminders] as AnyItem[])
    } catch (e) {
      console.error('Failed to fetch items', e)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  /** Silent background refresh — no loading spinner, used by AI chat */
  const silentRefresh = useCallback(() => fetchAll(true), [fetchAll])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Refresh data whenever the app becomes visible (user opens from toolbar / switches back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchAll(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchAll])

  const addItem = useCallback(async (type: AnyItem['type'], data: Partial<CalendarEvent | Task | Reminder>) => {
    const endpoint = type === 'event' ? '/api/events' : type === 'task' ? '/api/tasks' : '/api/reminders'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to create item')
    const created = await res.json() as AnyItem
    setItems(prev => [created, ...prev])
    return created
  }, [])

  const updateItem = useCallback(async (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => {
    const endpoint = type === 'event' ? `/api/events/${id}` : type === 'task' ? `/api/tasks/${id}` : `/api/reminders/${id}`
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to update item')
    const updated = await res.json() as AnyItem
    setItems(prev => prev.map(i => i._id === id ? updated : i))
    return updated
  }, [])

  const deleteItem = useCallback(async (type: AnyItem['type'], id: string) => {
    const endpoint = type === 'event' ? `/api/events/${id}` : type === 'task' ? `/api/tasks/${id}` : `/api/reminders/${id}`
    await fetch(endpoint, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i._id !== id))
  }, [])

  return { items, loading, refetch: fetchAll, silentRefresh, addItem, updateItem, deleteItem }
}
