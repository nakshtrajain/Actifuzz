import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ListChecks } from 'lucide-react'
import { getItem, setItem } from '../lib/storage'
import { useProfile } from '../lib/profile'
import type { Theme } from '../lib/theme'
import ProfileCard from './ProfileCard'
import TodoSidebar from './TodoSidebar'
import ThemeToggle from './ThemeToggle'

const OPEN_KEY = 'actifuzz:rightSidebarOpen'

export default function RightSidebar({
  theme,
  onToggleTheme,
  themeLoaded,
}: {
  theme: Theme
  onToggleTheme: () => void
  themeLoaded: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const { photo } = useProfile()

  useEffect(() => {
    getItem<boolean>(OPEN_KEY, true).then((v) => {
      setExpanded(v)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) setItem(OPEN_KEY, expanded)
  }, [expanded, loaded])

  return (
    <motion.aside
      animate={{ width: expanded ? 300 : 64 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      onClick={() => setExpanded((e) => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setExpanded((v) => !v)}
      aria-label={expanded ? 'Collapse profile & tasks' : 'Expand profile & tasks'}
      className="surface right-sidebar"
    >
      <AnimatePresence mode="wait">
        {expanded ? (

          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="right-sidebar__content"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ProfileCard />
            </div>
            {themeLoaded && (
              <div className="right-sidebar__theme-row" onClick={(e) => e.stopPropagation()}>
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              </div>
            )}
            <div className="right-sidebar__divider" />
            <TodoSidebar />
          </motion.div>

        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="right-sidebar__collapsed"
          >
            <div className="right-sidebar__collapsed-avatar">
              {photo ? <img src={photo} alt="Profile" /> : <User size={16} strokeWidth={1.75} />}
            </div>
            <ListChecks className="right-sidebar__collapsed-icon" size={20} strokeWidth={1.75} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}