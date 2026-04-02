'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Note } from '@/types'

const MAX_NOTES = 30
const FLUSH_DELAY = 10_000   // coalesce updates per note, flush after 10s of inactivity

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])

  // Pending patches keyed by note _id — merges arrive here before hitting the network
  const pendingRef = useRef<Record<string, Partial<Note>>>({})
  const timersRef  = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetch('/api/notes').then(r => r.json()).then(setNotes).catch(console.error)
  }, [])

  // Flush a single note's accumulated patch to the API
  const flushNote = useCallback((id: string) => {
    const patch = pendingRef.current[id]
    if (!patch) return
    delete pendingRef.current[id]
    delete timersRef.current[id]
    fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(console.error)
  }, [])

  // Flush all pending patches immediately (called on page unload)
  const flushAll = useCallback(() => {
    for (const id of Object.keys(pendingRef.current)) {
      clearTimeout(timersRef.current[id])
      flushNote(id)
    }
  }, [flushNote])

  // Flush on unmount / tab close so no writes are lost
  useEffect(() => {
    const handler = () => flushAll()
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      flushAll()
    }
  }, [flushAll])

  const addNote = useCallback(async (color = '#fef9c3') => {
    if (notes.length >= MAX_NOTES) return
    const position = { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 }
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '', color, position }),
    })
    const note = await res.json() as Note
    setNotes(prev => [note, ...prev])
    return note
  }, [notes.length])

  const updateNote = useCallback((id: string, data: Partial<Note>) => {
    // 1. Update local state immediately — UI stays snappy
    setNotes(prev => prev.map(n => n._id === id ? { ...n, ...data } : n))

    // 2. Merge patch (position/size/content/color all coalesce into one object)
    pendingRef.current[id] = { ...pendingRef.current[id], ...data }

    // 3. Reset the debounce timer for this note
    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => flushNote(id), FLUSH_DELAY)
  }, [flushNote])

  const deleteNote = useCallback(async (id: string) => {
    // Cancel any pending writes for a deleted note
    if (timersRef.current[id]) clearTimeout(timersRef.current[id])
    delete pendingRef.current[id]
    delete timersRef.current[id]

    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n._id !== id))
  }, [])

  return { notes, addNote, updateNote, deleteNote, maxReached: notes.length >= MAX_NOTES }
}
