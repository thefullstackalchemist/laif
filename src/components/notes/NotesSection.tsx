'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Folder, FolderOpen, ChevronDown, Plus, Check, X, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderNode {
  _id:      string
  name:     string
  parent:   string | null
  children: FolderNode[]
}

interface Props {
  collapsed: boolean
}

function buildTree(folders: FolderNode[], parentId: string | null): FolderNode[] {
  return folders
    .filter(f => f.parent === parentId)
    .map(f => ({ ...f, children: buildTree(folders, f._id) }))
}

export default function NotesSection({ collapsed }: Props) {
  const pathname     = usePathname()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const activeFolderId = pathname === '/pim-notes'
    ? (searchParams.get('folder') ?? 'root')
    : null

  const [folders,      setFolders]      = useState<FolderNode[]>([])
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set(['root']))
  const [creating,     setCreating]     = useState(false)
  const [newFolderParent, setNewFolderParent] = useState<string>('root')
  const [newName,      setNewName]      = useState('')
  const [saving,       setSaving]       = useState(false)
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameValue,  setRenameValue]  = useState('')

  useEffect(() => {
    fetch('/api/fs-folders')
      .then(r => r.json())
      .then((data: FolderNode[]) => setFolders(data))
      .catch(() => {})
  }, [])

  const tree = buildTree(folders, null)

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openNewFolder(parentId: string) {
    setNewFolderParent(parentId)
    setNewName('')
    setCreating(true)
    setExpanded(prev => { const s = new Set(prev); s.add(parentId); return s })
  }

  async function submitNewFolder() {
    if (!newName.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/fs-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), parent: newFolderParent }),
      })
      const folder = await res.json()
      setFolders(prev => [...prev, { ...folder, children: [] }])
      setCreating(false)
      setNewName('')
      router.push(`/pim-notes?folder=${folder._id}`)
    } finally {
      setSaving(false)
    }
  }

  async function submitRename(id: string) {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    await fetch(`/api/fs-folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setFolders(prev => prev.map(f => f._id === id ? { ...f, name } : f))
    setRenamingId(null)
  }

  async function deleteFolder(id: string) {
    await fetch(`/api/fs-folders/${id}`, { method: 'DELETE' })
    const allIds = new Set<string>()
    function collect(fid: string) {
      allIds.add(fid)
      folders.filter(f => f.parent === fid).forEach(f => collect(f._id))
    }
    collect(id)
    setFolders(prev => prev.filter(f => !allIds.has(f._id)))
    // If currently viewing a deleted folder, go to root
    if (activeFolderId && allIds.has(activeFolderId)) {
      router.push('/pim-notes?folder=root')
    }
  }

  function renderNode(node: FolderNode, depth = 0): React.ReactNode {
    const isActive   = activeFolderId === node._id
    const isExpanded = expanded.has(node._id)
    const hasChildren = node.children.length > 0
    const isJournal  = node._id === 'journal'
    const isRoot     = node._id === 'root'

    if (isRoot) {
      return (
        <div key={node._id}>
          {!collapsed && (
            <div className="flex items-center justify-between px-2 mt-3 mb-1">
              <span className="text-xs font-medium tracking-wider" style={{ color: 'var(--text-3)' }}>
                NOTES
              </span>
              <button
                onClick={() => openNewFolder('root')}
                className="p-0.5 rounded hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-3)' }}
                title="New folder"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
          {node.children.map(child => renderNode(child, depth))}

          {/* Inline new-folder input under root */}
          {!collapsed && creating && newFolderParent === 'root' && (
            <div className="flex items-center gap-1 px-2 py-1 mt-0.5">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitNewFolder()
                  if (e.key === 'Escape') { setCreating(false); setNewName('') }
                }}
                placeholder="Folder name…"
                className="flex-1 text-xs bg-transparent outline-none min-w-0"
                style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--border-hover)' }}
              />
              <button onClick={submitNewFolder} disabled={saving}>
                <Check size={12} style={{ color: 'var(--accent)' }} />
              </button>
              <button onClick={() => { setCreating(false); setNewName('') }}>
                <X size={12} style={{ color: 'var(--text-3)' }} />
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={node._id} className={!collapsed ? 'group relative' : ''}>
        {!collapsed && !isJournal && renamingId === node._id ? (
          <div
            className="flex items-center gap-1 py-1"
            style={{ paddingLeft: depth > 0 ? `${8 + depth * 12}px` : 8, paddingRight: 8 }}
          >
            <Folder size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  submitRename(node._id)
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onBlur={() => submitRename(node._id)}
              className="flex-1 text-xs bg-transparent outline-none min-w-0"
              style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--border-hover)' }}
            />
          </div>
        ) : (
          <button
            onClick={() => {
              router.push(`/pim-notes?folder=${node._id}`)
              if (hasChildren) toggle(node._id)
            }}
            className={cn(
              'sidebar-item w-full',
              isActive && 'active',
              collapsed && 'justify-center px-0',
              !collapsed && !isJournal && 'pr-14',
            )}
            style={depth > 0 && !collapsed ? { paddingLeft: `${8 + depth * 12}px` } : undefined}
            title={collapsed ? node.name : undefined}
          >
            {!collapsed && hasChildren && (
              <span
                className="flex-shrink-0 transition-transform duration-150"
                style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-3)' }}
                onClick={e => { e.stopPropagation(); toggle(node._id) }}
              >
                <ChevronDown size={11} />
              </span>
            )}
            {isJournal
              ? <BookOpen size={14} className="flex-shrink-0" />
              : (isExpanded && hasChildren
                ? <FolderOpen size={14} className="flex-shrink-0" />
                : <Folder size={14} className="flex-shrink-0" />)
            }
            {!collapsed && <span className="truncate">{node.name}</span>}
          </button>
        )}

        {/* Rename / delete — only for real folders, not journal */}
        {!collapsed && !isJournal && renamingId !== node._id && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); setRenamingId(node._id); setRenameValue(node.name) }}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--text-3)' }}
              title="Rename"
            >
              <Pencil size={10} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); deleteFolder(node._id) }}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--text-3)' }}
              title="Delete folder"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}

        {/* Inline new-folder input under this folder */}
        {!collapsed && creating && newFolderParent === node._id && (
          <div
            className="flex items-center gap-1 py-1 mt-0.5"
            style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
          >
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNewFolder()
                if (e.key === 'Escape') { setCreating(false); setNewName('') }
              }}
              placeholder="Folder name…"
              className="flex-1 text-xs bg-transparent outline-none min-w-0"
              style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--border-hover)' }}
            />
            <button onClick={submitNewFolder} disabled={saving}>
              <Check size={12} style={{ color: 'var(--accent)' }} />
            </button>
            <button onClick={() => { setCreating(false); setNewName('') }}>
              <X size={12} style={{ color: 'var(--text-3)' }} />
            </button>
          </div>
        )}

        {!collapsed && isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  if (tree.length === 0) return null

  return (
    <div className={cn('pb-1', collapsed && 'px-1')}>
      {tree.map(node => renderNode(node, 0))}
    </div>
  )
}
