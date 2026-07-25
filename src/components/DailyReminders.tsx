import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coffee, UtensilsCrossed, Pill, Droplet, Check } from 'lucide-react'
import { getItem, setItem } from '../lib/storage'
import { todayKey } from '../lib/time'

type ReminderState = {
  breakfast: boolean
  lunch: boolean
  medicine: boolean
  water: number // liters, 0-3
}

const EMPTY: ReminderState = { breakfast: false, lunch: false, medicine: false, water: 0 }
const KEY_PREFIX = 'actifuzz:reminders:'
const WATER_TARGET = 3

const CARD_META = [
  { id: 'breakfast', label: 'Breakfast', Icon: Coffee },
  { id: 'lunch', label: 'Lunch', Icon: UtensilsCrossed },
  { id: 'medicine', label: 'Medicine', Icon: Pill },
] as const

export default function DailyReminders() {
  const [state, setState] = useState<ReminderState>(EMPTY)
  const today = todayKey()
  const key = KEY_PREFIX + today

  useEffect(() => {
    getItem<ReminderState>(key, EMPTY).then(setState)
  }, [key])

  function update(next: ReminderState) {
    setState(next)
    setItem(key, next)
  }

  const doneCount = useMemo(
    () => [state.breakfast, state.lunch, state.medicine, state.water >= WATER_TARGET].filter(Boolean).length,
    [state],
  )

  return (
    <div className="daily-reminders">
      <div className="daily-reminders__header">
        <h3 className="daily-reminders__title">Today's Reminders</h3>
        <span className="daily-reminders__count">{doneCount}/4 done</span>
      </div>

      <div className="reminder-grid">
        {CARD_META.map((c) => {
          const checked = state[c.id as 'breakfast' | 'lunch' | 'medicine']
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => update({ ...state, [c.id]: !checked })}
              className="surface reminder-card"
            >
              <c.Icon className="reminder-card__icon" strokeWidth={1.75} />
              <span className="reminder-card__label">{c.label}</span>
              <AnimatePresence>
                {checked && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="reminder-card__tick"
                  >
                    <Check size={11} strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}

        {/* Water — tap the drops to log liters */}
        <div className="surface reminder-card">
          <Droplet className="reminder-card__icon" strokeWidth={1.75} />
          <span className="reminder-card__label">
            Water {state.water.toFixed(1)}/{WATER_TARGET}L
          </span>
          <div className="reminder-card__drops">
            {Array.from({ length: WATER_TARGET }).map((_, i) => (
              <button
                key={i}
                onClick={() => update({ ...state, water: state.water === i + 1 ? i : i + 1 })}
                className={`focus-ring reminder-card__drop ${i < state.water ? 'reminder-card__drop--filled' : ''}`}
                aria-label={`Log ${i + 1} liter${i === 0 ? '' : 's'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}