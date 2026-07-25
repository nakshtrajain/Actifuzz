import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sunrise, Sun, Sunset, Moon, Stars } from 'lucide-react'
import { getISTHour } from '../lib/time'
import { useProfile } from '../lib/profile'

const SALUTATIONS = ['Welcome aboard', 'Hi', 'Hola', 'Hello', 'Greetings', 'Salutations', 'Hey there', 'Howdy', 'Ahoy', 'Bonjour', 'Ciao', 'Namaste', 'Salaam', 'Shalom']

function TimeIcon({ hour }: { hour: number }) {
  if (hour < 5) return <Stars className="greeting__icon" strokeWidth={1.75} />
  if (hour < 12) return <Sunrise className="greeting__icon" strokeWidth={1.75} />
  if (hour < 17) return <Sun className="greeting__icon" strokeWidth={1.75} />
  if (hour < 21) return <Sunset className="greeting__icon" strokeWidth={1.75} />
  return <Moon className="greeting__icon" strokeWidth={1.75} />
}

function timeLine(hour: number): string {
  if (hour < 12) return 'Good morning — have a productive one.'
  if (hour < 17) return 'Good afternoon — keep the momentum going.'
  if (hour < 21) return 'Good evening — wind down when ready.'
  return "Good night — don't forget to rest."
}

export default function Greeting() {
  const { name } = useProfile()
  const [hour, setHour] = useState(getISTHour())
  const [salutation] = useState(() => SALUTATIONS[Math.floor(Math.random() * SALUTATIONS.length)])

  useEffect(() => {
    const id = setInterval(() => setHour(getISTHour()), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="greeting"
    >
      <div className="greeting__title-row">
        <AnimatePresence mode="wait">
          <motion.span
            key={hour}
            initial={{ rotate: -15, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
            className="greeting__icon-wrap"
          >
            <TimeIcon hour={hour} />
          </motion.span>
        </AnimatePresence>
        <h1 className="greeting__title">
          {salutation}, <span className="greeting__name">{name}</span>!
        </h1>
      </div>
      <p className="greeting__subtitle">{timeLine(hour)}</p>
    </motion.div>
  )
}