'use client'
import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'

interface Props {
  content: string          // Tiptap JSON string (or empty)
  onChange: (json: string) => void
  date: string             // 'YYYY-MM-DD' — used as key to remount on day change
}

export default function JournalEditor({ content, onChange, date }: Props) {
  const onChangeFn = useRef(onChange)
  useEffect(() => { onChangeFn.current = onChange }, [onChange])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable heading levels 4-6 — keep it minimal
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
  }, [date]) // remount editor when date changes

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
        .tiptap ul, .tiptap ol {
          padding-left: 1.4em;
          margin: 0.25em 0 0.5em;
        }
        .tiptap li { margin: 0.1em 0; line-height: 1.55; }
        .tiptap strong { font-weight: 600; color: var(--text-1); }
        .tiptap em { color: var(--text-2); }

        /* ── Task list (embedded todos) ─────────────────────── */
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
      `}</style>

      <EditorContent
        editor={editor}
        style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}
      />
    </>
  )
}
