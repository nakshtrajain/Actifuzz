import { useEffect, useRef, useState } from 'react'
import { Circle, Pause, Sunrise } from 'lucide-react'
import { todayKey } from '../lib/time'
import { getItem, setItem, onItemChange } from '../lib/storage'

const BANKED_PREFIX = 'actifuzz:worktimer:' // per-day finalized seconds, unchanged format (still a plain number)
const RUNNING_SINCE_KEY = 'actifuzz:worktimer:runningSince' // epoch ms | null - shared across every tab
const HEARTBEAT_KEY = 'actifuzz:worktimer:heartbeat' // epoch ms - proves *some* tab was alive recently
const PAUSED_KEY = 'actifuzz:worktimer:paused' // { date, value } - the user's explicit pause choice

const HEARTBEAT_INTERVAL_S = 20
const STALE_THRESHOLD_MS = 45_000 // if heartbeat is older than this, assume the browser was fully closed

type PausedRecord = { date: string; value: boolean }

function fmt(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function WorkTimer() {
  const [display, setDisplay] = useState(0)
  const [running, setRunning] = useState(false)
  const [ready, setReady] = useState(false)

  // Refs (not state) so the interval always reads the latest value without re-subscribing.
  const dayRef = useRef(todayKey())
  const bankedRef = useRef(0) // seconds finalized for dayRef.current, before any live segment
  const runningSinceRef = useRef<number | null>(null)

  function recomputeDisplay() {
    const extra = runningSinceRef.current ? Math.floor((Date.now() - runningSinceRef.current) / 1000) : 0
    setDisplay(bankedRef.current + extra)
  }

  async function pause() {
    if (runningSinceRef.current) {
      const elapsed = Math.floor((Date.now() - runningSinceRef.current) / 1000)
      bankedRef.current += elapsed
      await setItem(BANKED_PREFIX + dayRef.current, bankedRef.current)
    }
    runningSinceRef.current = null
    setRunning(false)
    recomputeDisplay()
    await setItem(RUNNING_SINCE_KEY, null) // <- every other tab's listener fires from this write
    await setItem(PAUSED_KEY, { date: dayRef.current, value: true } as PausedRecord)
  }

  async function resume() {
    const now = Date.now()
    runningSinceRef.current = now
    setRunning(true)
    recomputeDisplay()
    await setItem(RUNNING_SINCE_KEY, now) // <- every other tab's listener fires from this write
    await setItem(HEARTBEAT_KEY, now)
    await setItem(PAUSED_KEY, { date: dayRef.current, value: false } as PausedRecord)
  }

  async function resetTimer() {
    const confirmed = window.confirm("Reset today's timer to 00:00:00? This can't be undone.")
    if (!confirmed) return

    dayRef.current = todayKey()
    bankedRef.current = 0
    const now = Date.now()

    if (runningSinceRef.current) {
      // Still running — restart the live segment from right now instead of an old timestamp.
      runningSinceRef.current = now
      await setItem(RUNNING_SINCE_KEY, now)
      await setItem(HEARTBEAT_KEY, now)
    }

    await setItem(BANKED_PREFIX + dayRef.current, 0)
    await setItem(PAUSED_KEY, { date: dayRef.current, value: !running } as PausedRecord)

    recomputeDisplay()
  }

  // Initial load, reconciling with whatever state other tabs/the last session left behind.
  useEffect(() => {
    let cancelled = false

    async function init() {
      const today = dayRef.current
      // eslint-disable-next-line prefer-const
      let [todayBanked, pausedRecord, runningSince, heartbeat] = await Promise.all([
        getItem<number>(BANKED_PREFIX + today, 0),
        getItem<PausedRecord>(PAUSED_KEY, { date: '', value: false }),
        getItem<number | null>(RUNNING_SINCE_KEY, null),
        getItem<number | null>(HEARTBEAT_KEY, null),
      ])
      if (cancelled) return

      // A live segment left running from a PREVIOUS calendar day (browser closed
      // overnight while tracking) belongs to that day's total, not today's — finalize
      // it there first, before any of the same-day logic below runs.
      if (runningSince != null && todayKey(new Date(runningSince)) !== today) {
        const cutoff = heartbeat ?? runningSince
        const elapsedOnOldDay = Math.max(0, Math.floor((cutoff - runningSince) / 1000))
        const oldDayKey = BANKED_PREFIX + todayKey(new Date(runningSince))
        const oldDayBanked = await getItem<number>(oldDayKey, 0)
        await setItem(oldDayKey, oldDayBanked + elapsedOnOldDay)
        await setItem(RUNNING_SINCE_KEY, null)
        runningSince = null
      }

      bankedRef.current = todayBanked
      const userPaused = pausedRecord.date === today ? pausedRecord.value : false
      if (userPaused) {
        // Someone explicitly paused (possibly in another tab, possibly last session) — stay paused.
        runningSinceRef.current = null
        setRunning(false)
        await setItem(RUNNING_SINCE_KEY, null)
      } else if (runningSince == null) {
        // Nothing else is tracking right now — start a fresh live segment.
        const now = Date.now()
        runningSinceRef.current = now
        setRunning(true)
        await setItem(RUNNING_SINCE_KEY, now)
        await setItem(HEARTBEAT_KEY, now)
      } else if (heartbeat != null && Date.now() - heartbeat > STALE_THRESHOLD_MS) {
        // A segment was left "running" but no tab has checked in for a while —
        // the browser was almost certainly closed in between. Bank time up to the
        // last confirmed-alive moment only, discard the dead gap, start fresh.
        const elapsedBeforeGap = Math.max(0, Math.floor((heartbeat - runningSince) / 1000))
        bankedRef.current += elapsedBeforeGap
        await setItem(BANKED_PREFIX + today, bankedRef.current)
        const now = Date.now()
        runningSinceRef.current = now
        setRunning(true)
        await setItem(RUNNING_SINCE_KEY, now)
        await setItem(HEARTBEAT_KEY, now)
      } else {
        // Another tab is already actively tracking — adopt the same segment, don't reset it.
        runningSinceRef.current = runningSince
        setRunning(true)
        await setItem(HEARTBEAT_KEY, Date.now())
      }

      recomputeDisplay()
      setReady(true)
    }
    init()

    // Live sync: whenever ANY tab pauses/resumes, every other tab hears about it immediately.
    const unsubscribe = onItemChange<number | null>(RUNNING_SINCE_KEY, async (value) => {
      const freshBanked = await getItem<number>(BANKED_PREFIX + dayRef.current, bankedRef.current)
      bankedRef.current = freshBanked
      runningSinceRef.current = value ?? null
      setRunning(value != null)
      recomputeDisplay()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Redraw every second; checkpoint to storage periodically; roll over at midnight.
  useEffect(() => {
    if (!ready) return
    let tickCount = 0
    const id = setInterval(() => {
      const currentDay = todayKey()
      if (currentDay !== dayRef.current) {
        if (runningSinceRef.current) {
          const elapsed = Math.floor((Date.now() - runningSinceRef.current) / 1000)
          setItem(BANKED_PREFIX + dayRef.current, bankedRef.current + elapsed)
        }
        dayRef.current = currentDay
        bankedRef.current = 0
        if (runningSinceRef.current) {
          const now = Date.now()
          runningSinceRef.current = now
          setItem(RUNNING_SINCE_KEY, now)
        }
      }

      recomputeDisplay()

      tickCount++
      if (running && runningSinceRef.current && tickCount % HEARTBEAT_INTERVAL_S === 0) {
        // Only prove liveness here — do NOT also write the running total into
        // BANKED_PREFIX. Writing a live "total so far" into the same key that a
        // freshly-opened tab reads as its baseline is exactly what caused the
        // double-counting bug: every new tab would add its own elapsed time on
        // top of a number that already included that same elapsed time.
        setItem(HEARTBEAT_KEY, Date.now())
      }
    }, 1000)
    return () => clearInterval(id)
  }, [ready, running])

  return (
    <div className="surface work-timer">
      <p className="work-timer__label">Today's Log</p>
      <p className="tabular work-timer__time">{fmt(display)}</p>
      <button
        onClick={() => (running ? pause() : resume())}
        className={`focus-ring work-timer__toggle ${running ? 'work-timer__toggle--running' : 'work-timer__toggle--paused'}`}
      >
        {running ? (
          <>
            <Circle size={8} fill="currentColor" strokeWidth={0} /> Work in Progress — keep going!
          </>
        ) : (
          <>
            <Pause size={11} strokeWidth={2.5} /> Took a break? — Less go again..!
          </>
        )}
      </button>
      <button onClick={resetTimer} className="focus-ring work-timer__reset-btn">
        <Sunrise size={11} strokeWidth={2} /> New day? Let's start fresh
      </button>
    </div>
  )
}