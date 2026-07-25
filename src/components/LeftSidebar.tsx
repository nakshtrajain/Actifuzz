import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Code2,
  Music2,
  Mail,
  MessageCircle,
  GitBranch,
  Bot,
  SquarePlay,
  Link2,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { getItem, setItem } from '../lib/storage'

type Shortcut = { id: string; name: string; url: string }

const APPS_KEY = 'actifuzz:apps'
const TABS_KEY = 'actifuzz:tabs'
const OPEN_KEY = 'actifuzz:leftSidebarOpen'

const DEFAULT_APPS: Shortcut[] = [
  { id: 'a1', name: 'VS Code', url: 'vscode://' },
  { id: 'a2', name: 'Spotify', url: 'spotify://' },
  { id: 'a3', name: 'Mail', url: 'mailto:' },
  { id: 'a4', name: 'WhatsApp', url: 'https://web.whatsapp.com' },
]

const DEFAULT_TABS: Shortcut[] = [
  { id: 't1', name: 'GitHub', url: 'https://github.com' },
  { id: 't2', name: 'Gmail', url: 'https://mail.google.com' },
  { id: 't3', name: 'Claude', url: 'https://claude.ai' },
  { id: 't4', name: 'YouTube', url: 'https://youtube.com' },
]

// One consistent icon set for known shortcuts, generic link icon for anything custom.
const NAME_ICON_MAP: Record<string, LucideIcon> = {
  'vs code': Code2,
  spotify: Music2,
  mail: Mail,
  whatsapp: MessageCircle,
  github: GitBranch,
  gmail: Mail,
  claude: Bot,
  youtube: SquarePlay,
}

function iconFor(name: string): LucideIcon {
  return NAME_ICON_MAP[name.trim().toLowerCase()] ?? Link2
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function open(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ShortcutList({
  title,
  storageKey,
  defaults,
  expanded,
}: {
  title: string
  storageKey: string
  defaults: Shortcut[]
  expanded: boolean
}) {
  const [items, setItems] = useState<Shortcut[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    getItem<Shortcut[]>(storageKey, defaults).then(setItems)
  }, [])

  function persist(next: Shortcut[]) {
    setItems(next)
    setItem(storageKey, next)
  }

  function addItem() {
    if (!name.trim() || !url.trim()) return
    persist([...items, { id: uid(), name: name.trim(), url: url.trim() }])
    setName('')
    setUrl('')
    setAdding(false)
  }

  function removeItem(id: string) {
    persist(items.filter((i) => i.id !== id))
  }

  return (
    <div className="left-sidebar__section">
      {expanded && (
        <div className="left-sidebar__section-header" onClick={(e) => e.stopPropagation()}>
          <span className="left-sidebar__section-title">{title}</span>
          <button
            onClick={() => setAdding((a) => !a)}
            className="focus-ring left-sidebar__add-btn"
            aria-label={`Add to ${title}`}
          >
            {adding ? <X size={12} /> : <Plus size={12} />}
          </button>
        </div>
      )}

      {expanded && adding && (
        <div className="left-sidebar__form" onClick={(e) => e.stopPropagation()}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="focus-ring left-sidebar__input"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL / protocol"
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="focus-ring left-sidebar__input"
          />
          <button onClick={addItem} className="focus-ring left-sidebar__save-btn">
            Save
          </button>
        </div>
      )}

      {items.map((item) => {
        const Icon = iconFor(item.name)
        return (
          <div key={item.id} className="left-sidebar__item-row" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => open(item.url)}
              title={item.name}
              className={`focus-ring left-sidebar__item ${expanded ? 'left-sidebar__item--expanded' : ''}`}
            >
              <Icon className="left-sidebar__item-icon" strokeWidth={1.75} />
              {expanded && <span className="left-sidebar__item-name">{item.name}</span>}
            </button>
            {expanded && (
              <button
                onClick={() => removeItem(item.id)}
                className="focus-ring left-sidebar__item-remove"
                aria-label={`Remove ${item.name}`}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function LeftSidebar() {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getItem<boolean>(OPEN_KEY, false).then((v) => {
      setExpanded(v)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) setItem(OPEN_KEY, expanded)
  }, [expanded, loaded])

  return (
    <motion.aside
      animate={{ width: expanded ? 224 : 76 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      onClick={() => setExpanded((e) => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
      aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      className="left-sidebar"
    >
      <div className="left-sidebar__logo">
        <Compass size={18} strokeWidth={1.75} />
      </div>

      <div className="left-sidebar__divider" />

      <div className="left-sidebar__sections">
        <ShortcutList title="Apps" storageKey={APPS_KEY} defaults={DEFAULT_APPS} expanded={expanded} />
        <div className="left-sidebar__divider" />
        <ShortcutList title="Tabs" storageKey={TABS_KEY} defaults={DEFAULT_TABS} expanded={expanded} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="left-sidebar__hint"
          >
            Tap the sidebar to collapse
          </motion.p>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}