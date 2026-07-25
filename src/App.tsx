import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import Greeting from './components/Greeting'
import ClockPanel from './components/ClockPanel'
import WorkTimer from './components/WorkTimer'
import AttendanceCalendar from './components/AttendanceCalendar'
import DailyReminders from './components/DailyReminders'
import LeftSidebar from './components/LeftSidebar'
import RightSidebar from './components/RightSidebar'
import { useTheme } from './lib/theme'
import quotes from './quotes.json'
import './App.css'

function BrandMark() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="brand"
    >
      <svg width="30" height="30" viewBox="0 0 30 30" className="brand__logo">
        <circle cx="15" cy="15" r="14" className="brand__logo-ring" />
        <circle cx="15" cy="15" r="3.2" className="brand__logo-hub" />
        <line x1="15" y1="15" x2="15" y2="6" className="brand__logo-hand" />
        <line x1="15" y1="15" x2="21" y2="17.5" className="brand__logo-hand brand__logo-hand--accent" />
      </svg>
      <div className="brand__text">
        <p className="brand__name">
          ACTI<span className="brand__name-accent">FUZZ</span>
        </p>
        <p className="brand__tagline">One Dashboard</p>
      </div>
    </motion.div>
  )
}

function QuoteOfTheDay() {
  const [entry] = useState(() => quotes[Math.floor(Math.random() * quotes.length)])
  if (!entry) return null

  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="quote"
      title={`${entry.quote} — ${entry.author}`}
    >
      “{entry.quote}” <span className="quote__author">— {entry.author}</span>
    </motion.p>
  )
}

function ChatGptSearchBox() {
  const [query, setQuery] = useState('')

  function submit() {
    const q = query.trim()
    if (!q) return
    window.open(`https://chatgpt.com/?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer')
    setQuery('')
  }

  return (
    <div className="surface chatgpt-search">
      <Sparkles className="chatgpt-search__icon" strokeWidth={1.75} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Ask ChatGPT anything…"
        className="focus-ring chatgpt-search__input"
      />
    </div>
  )
}

function App() {
  const { theme, toggle, loaded } = useTheme()

  return (
    <div className="app-shell">
      <div className="app-shell__blob app-shell__blob--a" />
      <div className="app-shell__blob app-shell__blob--b" />

      <div className="app-shell__body">
        <div className="app-shell__topbar">
          <BrandMark />
          <QuoteOfTheDay />
          <Greeting />
        </div>

        <div className="app-shell__main">
          <LeftSidebar />

          <div className="app-shell__center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="app-shell__clock-row"
            >
              <ClockPanel />
              <ChatGptSearchBox />
              <WorkTimer />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
            >
              <DailyReminders />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
              className="app-shell__attendance"
            >
              <AttendanceCalendar />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <RightSidebar theme={theme} onToggleTheme={toggle} themeLoaded={loaded} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default App