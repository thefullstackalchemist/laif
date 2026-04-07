'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Umbrella } from '@/types'

export function useUmbrellas() {
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([])
  const [loading, setLoading]     = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch('/api/umbrellas')
      const data = await res.json()
      setUmbrellas(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  async function create(name: string, color: string): Promise<Umbrella | null> {
    const res = await fetch('/api/umbrellas', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, color }),
    })
    if (!res.ok) return null
    const u: Umbrella = await res.json()
    setUmbrellas(prev => [...prev, u])
    return u
  }

  async function update(id: string, name: string, color: string) {
    const res = await fetch(`/api/umbrellas/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, color }),
    })
    if (!res.ok) return
    const u: Umbrella = await res.json()
    setUmbrellas(prev => prev.map(x => x._id === id ? u : x))
  }

  async function remove(id: string) {
    await fetch(`/api/umbrellas/${id}`, { method: 'DELETE' })
    setUmbrellas(prev => prev.filter(x => x._id !== id))
  }

  return { umbrellas, loading, create, update, remove }
}
