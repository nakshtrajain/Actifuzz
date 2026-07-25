import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Clock, Check, ChevronLeft, ChevronRight, Sun, CalendarOff, X } from 'lucide-react'
import { getItem, setItem } from '../lib/storage'
import { todayKey } from '../lib/time'

const KEY = 'actifuzz:attendance'
const WORK_KEY_PREFIX = 'actifuzz:worktimer:' // same keys WorkTimer.tsx writes to, one per day
const RUNNING_SINCE_KEY = 'actifuzz:worktimer:runningSince' // read-only here, WorkTimer.tsx owns writing it
const WEEKS_TO_SHOW = 5 // current week + 4 previous

type DayEntry = { status: 'present' } | { status: 'leave'; reason: string }
type AttendanceMap = Record<string, DayEntry> // 'yyyy-mm-dd' -> entry
type WeekSummary = { label: string; seconds: number; isCurrent: boolean }

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - copy.getDay()) // back to Sunday
  return copy
}

function weekRangeLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`
}

function fmtHours(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return '0h'
  return `${h}h ${String(m).padStart(2, '0')}m`
}

async function getWeekTotalSeconds(weekStart: Date): Promise<number> {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const totals = await Promise.all(days.map((d) => getItem<number>(WORK_KEY_PREFIX + dateKey(d), 0)))
  return totals.reduce((sum, v) => sum + v, 0)
}

// Old data was Record<string, boolean> (true = present). Migrate transparently.
function normalizeAttendance(raw: unknown): AttendanceMap {
  const out: AttendanceMap = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) {
      out[key] = { status: 'present' }
    } else if (value && typeof value === 'object' && 'status' in value) {
      const v = value as DayEntry
      if (v.status === 'present') out[key] = { status: 'present' }
      else if (v.status === 'leave') out[key] = { status: 'leave', reason: v.reason ?? '' }
    }
  }
  return out
}

export default function AttendanceCalendar() {
  const [data, setData] = useState<AttendanceMap>({})
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() } // month: 0-11
  })
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [weeks, setWeeks] = useState<WeekSummary[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')
  const [showReasonField, setShowReasonField] = useState(false)

  useEffect(() => {
    getItem<unknown>(KEY, {}).then((raw) => setData(normalizeAttendance(raw)))
  }, [])

  const today = todayKey()

  function persist(next: AttendanceMap) {
    setData(next)
    setItem(KEY, next)
  }

  function openDay(key: string) {
    const entry = data[key]
    setSelectedDay(key)
    setShowReasonField(entry?.status === 'leave')
    setReasonDraft(entry?.status === 'leave' ? entry.reason : '')
  }

  function closeDay() {
    setSelectedDay(null)
    setShowReasonField(false)
    setReasonDraft('')
  }

  function markPresent() {
    if (!selectedDay) return
    persist({ ...data, [selectedDay]: { status: 'present' } })
    closeDay()
  }

  function saveLeave() {
    if (!selectedDay) return
    persist({ ...data, [selectedDay]: { status: 'leave', reason: reasonDraft.trim() } })
    closeDay()
  }

  function clearDay() {
    if (!selectedDay) return
    const next = { ...data }
    delete next[selectedDay]
    persist(next)
    closeDay()
  }

  async function openWeekly() {
    const next = !weeklyOpen
    setWeeklyOpen(next)
    if (!next) return
    setWeeklyLoading(true)
    const thisWeekStart = startOfWeek(new Date())
    const weekStarts = Array.from({ length: WEEKS_TO_SHOW }, (_, i) => {
      const d = new Date(thisWeekStart)
      d.setDate(d.getDate() - 7 * i)
      return d
    })
    const seconds = await Promise.all(weekStarts.map(getWeekTotalSeconds))

    // Today's stored total only updates when a segment actually ends (pause, day
    // rollover, etc.) — top up "this week" with whatever's currently in-progress,
    // purely for display. Never written anywhere, so it can't cause drift.
    const runningSince = await getItem<number | null>(RUNNING_SINCE_KEY, null)
    if (runningSince != null) {
      seconds[0] += Math.floor((Date.now() - runningSince) / 1000)
    }

    setWeeks(
      weekStarts.map((ws, i) => ({
        label: i === 0 ? 'This week' : weekRangeLabel(ws),
        seconds: seconds[i],
        isCurrent: i === 0,
      })),
    )
    setWeeklyLoading(false)
  }

  const { year, month } = cursor
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const cells = useMemo(() => {
    const arr: (number | null)[] = Array(startWeekday).fill(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [startWeekday, daysInMonth])

  // streak: consecutive present days counting back from today.
  // Sundays are skipped entirely (never break it); a Leave day does break it.
  const streak = useMemo(() => {
    let count = 0
    const d = new Date()
    while (true) {
      if (d.getDay() === 0) {
        d.setDate(d.getDate() - 1) // Sunday — skip, doesn't count either way
        continue
      }
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      if (data[key]?.status === 'present') {
        count++
        d.setDate(d.getDate() - 1)
      } else break
    }
    return count
  }, [data])

  const monthStats = useMemo(() => {
    const prefix = `${year}-${pad(month + 1)}`
    let present = 0
    let leave = 0
    for (const [key, entry] of Object.entries(data)) {
      if (!key.startsWith(prefix)) continue
      if (entry.status === 'present') present++
      else if (entry.status === 'leave') leave++
    }
    return { present, leave }
  }, [data, year, month])

  const selectedEntry = selectedDay ? data[selectedDay] : undefined
  const selectedLabel = selectedDay
    ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="surface attendance">
      <div className="attendance__header">
        <h3 className="attendance__title">Attendance Log</h3>
        <div className="attendance__header-right">
          <div className="attendance__streak">
            <Flame size={14} strokeWidth={2} />
            {streak} day{streak === 1 ? '' : 's'} streak
          </div>
          <button
            onClick={openWeekly}
            className={`focus-ring attendance__weekly-btn ${weeklyOpen ? 'attendance__weekly-btn--active' : ''}`}
          >
            <Clock size={13} strokeWidth={2} />
            This week
          </button>

          <AnimatePresence>
            {weeklyOpen && (
              <>
                <motion.div
                  className="attendance__weekly-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setWeeklyOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="attendance__weekly-popover"
                >
                  <p className="attendance__weekly-popover-title">Working hours by week</p>
                  {weeklyLoading ? (
                    <p className="attendance__weekly-loading">Loading…</p>
                  ) : (
                    <ul className="attendance__weekly-list">
                      {weeks.map((w) => (
                        <li
                          key={w.label}
                          className={`attendance__weekly-row ${w.isCurrent ? 'attendance__weekly-row--current' : ''}`}
                        >
                          <span className="attendance__weekly-label">{w.label}</span>
                          <span className="attendance__weekly-hours">{fmtHours(w.seconds)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="attendance__subtitle">
        {monthStats.present} present · {monthStats.leave} on leave this month
      </p>

      <div className="attendance__nav">
        <button
          className="focus-ring attendance__nav-btn"
          onClick={() =>
            setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
          }
        >
          <ChevronLeft size={16} />
        </button>
        <span className="attendance__month">{monthLabel}</span>
        <button
          className="focus-ring attendance__nav-btn"
          onClick={() =>
            setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
          }
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="attendance__grid">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="attendance__weekday">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const key = `${year}-${pad(month + 1)}-${pad(d)}`
          const weekday = new Date(year, month, d).getDay()
          const isSunday = weekday === 0
          const isToday = key === today
          const isFuture = key > today
          const entry = data[key]

          if (isSunday) {
            return (
              <div
                key={i}
                className="attendance__day attendance__day--sunday"
                title="Sunday — holiday, not counted"
                aria-label={`${d}, Sunday — holiday, not counted in attendance`}
              >
                {d}
                <span className="attendance__sun-badge">
                  <Sun size={9} strokeWidth={2} />
                </span>
              </div>
            )
          }

          return (
            <motion.button
              key={i}
              whileTap={isFuture ? undefined : { scale: 0.88 }}
              onClick={() => !isFuture && openDay(key)}
              disabled={isFuture}
              title={
                isFuture
                  ? "Can't mark a future day"
                  : entry?.status === 'leave'
                    ? `On leave${entry.reason ? ': ' + entry.reason : ''}`
                    : undefined
              }
              className={`focus-ring attendance__day ${entry?.status === 'present' ? 'attendance__day--marked' : ''} ${
                entry?.status === 'leave' ? 'attendance__day--leave' : ''
              } ${isToday ? 'attendance__day--today' : ''} ${isFuture ? 'attendance__day--future' : ''}`}
            >
              {d}
              <AnimatePresence>
                {entry?.status === 'present' && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="attendance__check"
                  >
                    <Check size={10} strokeWidth={3} />
                  </motion.span>
                )}
                {entry?.status === 'leave' && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="attendance__check attendance__check--leave"
                  >
                    <CalendarOff size={9} strokeWidth={2.5} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              className="attendance__day-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDay}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="attendance__day-modal"
            >
              <div className="attendance__day-modal-header">
                <p className="attendance__day-modal-title">{selectedLabel}</p>
                <button onClick={closeDay} className="focus-ring attendance__day-modal-close" aria-label="Close">
                  <X size={14} />
                </button>
              </div>

              <div className="attendance__day-modal-actions">
                <button
                  onClick={markPresent}
                  className={`focus-ring attendance__day-modal-btn ${
                    selectedEntry?.status === 'present' ? 'attendance__day-modal-btn--active' : ''
                  }`}
                >
                  <Check size={14} strokeWidth={2.5} />
                  Present
                </button>
                <button
                  onClick={() => setShowReasonField(true)}
                  className={`focus-ring attendance__day-modal-btn attendance__day-modal-btn--leave ${
                    selectedEntry?.status === 'leave' ? 'attendance__day-modal-btn--active-leave' : ''
                  }`}
                >
                  <CalendarOff size={14} strokeWidth={2.25} />
                  Leave
                </button>
              </div>

              {showReasonField && (
                <div className="attendance__day-modal-reason-wrap">
                  <input
                    autoFocus
                    value={reasonDraft}
                    onChange={(e) => setReasonDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveLeave()}
                    placeholder="Reason for leave (optional)"
                    className="focus-ring attendance__day-modal-reason"
                  />
                  <button onClick={saveLeave} className="focus-ring attendance__day-modal-save-btn">
                    Save
                  </button>
                </div>
              )}

              {selectedEntry && (
                <button onClick={clearDay} className="focus-ring attendance__day-modal-clear-btn">
                  Clear this day
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}