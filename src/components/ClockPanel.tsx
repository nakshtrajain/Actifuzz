import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatClock, formatDayDate, getISTHMS } from '../lib/time'
import { getItem, setItem } from '../lib/storage'

type Face = 'digital' | 'analog-classic' | 'analog-minimal'

const FACE_KEY = 'actifuzz:clockFace'
const FACES: { id: Face; label: string }[] = [
  { id: 'digital', label: 'Digital' },
  { id: 'analog-classic', label: 'Analog · Classic' },
  { id: 'analog-minimal', label: 'Analog · Minimal' },
]

export default function ClockPanel() {
  const [now, setNow] = useState(new Date())
  const [face, setFace] = useState<Face>('digital')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getItem<Face>(FACE_KEY, 'digital').then((f) => {
      setFace(f)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (loaded) setItem(FACE_KEY, face)
  }, [face, loaded])

  const { time, period } = formatClock(now, true)
  const { day, date } = formatDayDate(now)

  return (
    <div className="surface clock-panel">
      <div className="clock-panel__glow" />

      <div className="clock-panel__faces">
        {FACES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFace(f.id)}
            className={`focus-ring clock-panel__face-btn ${face === f.id ? 'clock-panel__face-btn--active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="clock-panel__display">
        {face === 'digital' ? (
          <DigitalFace time={time} period={period} />
        ) : (
          <AnalogFace now={now} minimal={face === 'analog-minimal'} />
        )}
      </div>

      <div className="clock-panel__daydate">
        <p className="clock-panel__day">{day}</p>
        <p className="clock-panel__date">{date} · IST</p>
      </div>
    </div>
  )
}

function DigitalFace({ time, period }: { time: string; period: string }) {
  return (
    <motion.div
      key="digital"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="clock-digital"
    >
      <span className="tabular clock-digital__time">{time}</span>
      <span className="clock-digital__period">{period}</span>
    </motion.div>
  )
}

function AnalogFace({ now, minimal }: { now: Date; minimal: boolean }) {
  const { h, m, s } = getISTHMS(now)
  const hourDeg = (h % 12) * 30 + m * 0.5
  const minDeg = m * 6 + s * 0.1
  const secDeg = s * 6

  const size = 220
  const c = size / 2
  const ticks = []
  for (let i = 0; i < 60; i++) {
    const isHour = i % 5 === 0
    const angle = (i * 6 * Math.PI) / 180
    const rOuter = c - 6
    const rInner = isHour ? c - (minimal ? 16 : 18) : c - 11
    const x1 = c + rOuter * Math.sin(angle)
    const y1 = c - rOuter * Math.cos(angle)
    const x2 = c + rInner * Math.sin(angle)
    const y2 = c - rInner * Math.cos(angle)
    if (minimal && !isHour) continue
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={isHour ? 'clock-analog__tick clock-analog__tick--hour' : 'clock-analog__tick'}
      />,
    )
  }

  return (
    <motion.div
      key="analog"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={c - 2} className="clock-analog__face" />
        {ticks}
        <line
          x1={c} y1={c}
          x2={c} y2={c - 52}
          className="clock-analog__hand clock-analog__hand--hour"
          transform={`rotate(${hourDeg} ${c} ${c})`}
        />
        <line
          x1={c} y1={c}
          x2={c} y2={c - 78}
          className="clock-analog__hand clock-analog__hand--minute"
          transform={`rotate(${minDeg} ${c} ${c})`}
        />
        {!minimal && (
          <line
            x1={c} y1={c + 14}
            x2={c} y2={c - 88}
            className="clock-analog__hand clock-analog__hand--second"
            transform={`rotate(${secDeg} ${c} ${c})`}
          />
        )}
        <circle cx={c} cy={c} r="4.5" className="clock-analog__hub" />
      </svg>
    </motion.div>
  )
}
