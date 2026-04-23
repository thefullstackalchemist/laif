'use client'
import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import type { Editor } from '@tiptap/core'

interface Props {
  content: string
  onChange: (json: string) => void
  date: string
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function Btn({
  active, title, onClick, children,
}: {
  active?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 5, border: 'none', cursor: 'pointer',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--text-2)',
        fontSize: '0.8rem', fontWeight: 600, lineHeight: 1,
        transition: 'background 0.12s, color 0.12s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return (
    <span style={{
      width: 1, height: 16, background: 'var(--border)',
      flexShrink: 0, margin: '0 2px',
    }} />
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const h = (level: 1 | 2 | 3) => editor.isActive('heading', { level })
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '4px 6px',
      background: 'var(--surface, #1a1a2e)',
      border: '1px solid var(--border)',
      borderRadius: 9,
      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
    }}>
      {/* Inline */}
      <Btn active={editor.isActive('bold')} title="Bold (⌘B)"
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </Btn>
      <Btn active={editor.isActive('italic')} title="Italic (⌘I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em style={{ fontStyle: 'italic' }}>I</em>
      </Btn>
      <Btn active={editor.isActive('strike')} title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </Btn>
      <Btn active={editor.isActive('code')} title="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}>
        {'</>'}
      </Btn>

      <Sep />

      {/* Headings */}
      <Btn active={h(1)} title="Heading 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        H1
      </Btn>
      <Btn active={h(2)} title="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </Btn>
      <Btn active={h(3)} title="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </Btn>

      <Sep />

      {/* Lists */}
      <Btn active={editor.isActive('bulletList')} title="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        {/* bullet list icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="1.5" cy="3.5" r="1.2" fill="currentColor"/>
          <rect x="4" y="2.75" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          <circle cx="1.5" cy="7" r="1.2" fill="currentColor"/>
          <rect x="4" y="6.25" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          <circle cx="1.5" cy="10.5" r="1.2" fill="currentColor"/>
          <rect x="4" y="9.75" width="8" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
      </Btn>
      <Btn active={editor.isActive('orderedList')} title="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        {/* ordered list icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="0" y="4.5" fontSize="4.5" fill="currentColor" fontFamily="monospace">1.</text>
          <rect x="4" y="2.75" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          <text x="0" y="8.5" fontSize="4.5" fill="currentColor" fontFamily="monospace">2.</text>
          <rect x="4" y="6.25" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          <text x="0" y="12.5" fontSize="4.5" fill="currentColor" fontFamily="monospace">3.</text>
          <rect x="4" y="9.75" width="8" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
      </Btn>
      <Btn active={editor.isActive('taskList')} title="Task list"
        onClick={() => editor.chain().focus().toggleTaskList().run()}>
        {/* checkbox icon */}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="0.75" y="0.75" width="11.5" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <polyline points="3,6.5 5.5,9 10,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Btn>

      <Sep />

      {/* Block */}
      <Btn active={editor.isActive('blockquote')} title="Blockquote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        {/* quote icon */}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="0.75" y="2" width="2.5" height="9" rx="1.25" fill="currentColor"/>
          <rect x="5.25" y="2" width="2.5" height="9" rx="1.25" fill="currentColor"/>
        </svg>
      </Btn>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────
export default function JournalEditor({ content, onChange, date }: Props) {
  const onChangeFn = useRef(onChange)
  useEffect(() => { onChangeFn.current = onChange }, [onChange])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'What\'s on your mind today?  \nUse [ ] to add a todo or just write freely…',
        showOnlyWhenEditable: true,
      }),
    ],
    content: content ? JSON.parse(content) : '',
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      onChangeFn.current(JSON.stringify(editor.getJSON()))
    },
  }, [date])

  return (
    <>
      <style>{`
        /* ── Tiptap base ─────────────────────────────────────── */
        .tiptap { outline: none; }
        .tiptap p { margin: 0 0 0.35em; line-height: 1.55; }
        .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin: 1.1em 0 0.3em; color: var(--text-1); }
        .tiptap h2 { font-size: 1.2rem; font-weight: 600; margin: 0.9em 0 0.25em; color: var(--text-1); }
        .tiptap h3 { font-size: 1rem;   font-weight: 600; margin: 0.8em 0 0.2em; color: var(--text-1); }
        .tiptap blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 1em;
          margin: 0.6em 0;
          color: var(--text-2);
          font-style: italic;
        }
        .tiptap code {
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 0.1em 0.35em;
          font-size: 0.85em;
          font-family: ui-monospace, monospace;
        }
        .tiptap pre {
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1em;
          margin: 0.6em 0;
          overflow-x: auto;
        }
        .tiptap pre code { background: none; border: none; padding: 0; }
        .tiptap hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.2em 0;
        }
        .tiptap ul:not([data-type="taskList"]) {
          list-style-type: disc;
          padding-left: 1.4em;
          margin: 0.25em 0 0.5em;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.4em;
          margin: 0.25em 0 0.5em;
        }
        .tiptap li { margin: 0.1em 0; line-height: 1.55; }
        .tiptap strong { font-weight: 600; color: var(--text-1); }
        .tiptap em { color: var(--text-2); }

        /* ── Task list ─────────────────────────────────────── */
        .tiptap ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
          margin: 0.25em 0 0.5em;
        }
        .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: center;
          gap: 0.5em;
          padding: 0.2em 0.4em;
          border-radius: 6px;
          transition: background 0.1s;
          min-height: 1.6em;
        }
        .tiptap ul[data-type="taskList"] li:hover {
          background: var(--sidebar-item-hover);
        }
        .tiptap ul[data-type="taskList"] li > label {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          cursor: pointer;
          line-height: 1;
        }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border: 1.5px solid var(--border-hover);
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          background: transparent;
          flex-shrink: 0;
          display: block;
        }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
          background: var(--accent);
          border-color: var(--accent);
        }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 3px; top: 0px;
          width: 4px; height: 8px;
          border: 1.5px solid white;
          border-top: none; border-left: none;
          transform: rotate(45deg);
        }
        .tiptap ul[data-type="taskList"] li > div {
          flex: 1;
          line-height: 1.55;
          margin: 0;
          padding: 0;
        }
        .tiptap ul[data-type="taskList"] li > div p { margin: 0; }
        .tiptap ul[data-type="taskList"] li[data-checked="true"] > div {
          color: var(--text-3);
          text-decoration: line-through;
        }

        /* ── Placeholder ─────────────────────────────────────── */
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--text-3);
          pointer-events: none;
          float: left;
          height: 0;
          white-space: pre-line;
          line-height: 1.75;
        }

        /* ── Bubble menu hover states ────────────────────────── */
        .journal-bubble-btn:hover {
          background: var(--sidebar-item-hover) !important;
          color: var(--text-1) !important;
        }
      `}</style>

      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
        >
          <Toolbar editor={editor} />
        </BubbleMenu>
      )}

      <EditorContent
        editor={editor}
        style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}
      />
    </>
  )
}
