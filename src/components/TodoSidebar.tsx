import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { getItem, setItem } from '../lib/storage'
import { todayKey } from '../lib/time'

type Task = { id: string; text: string; date: string; done: boolean }
type Tab = 'today' | 'upcoming' | 'completed'

const KEY = 'actifuzz:tasks'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export default function TodoSidebar() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayKey())
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => {
    getItem<Task[]>(KEY, []).then(setTasks)
  }, [])

  function persist(next: Task[]) {
    setTasks(next)
    setItem(KEY, next)
  }

  function addTask() {
    if (!text.trim()) return
    persist([{ id: uid(), text: text.trim(), date, done: false }, ...tasks])
    setText('')
    setDate(todayKey())
  }

  function toggleDone(id: string) {
    persist(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function removeTask(id: string) {
    persist(tasks.filter((t) => t.id !== id))
  }

  const today = todayKey()
  const filtered = useMemo(() => {
    if (tab === 'completed') return tasks.filter((t) => t.done)
    if (tab === 'upcoming') return tasks.filter((t) => !t.done && t.date > today)
    return tasks.filter((t) => !t.done && t.date <= today)
  }, [tasks, tab, today])

  const counts = useMemo(
    () => ({
      today: tasks.filter((t) => !t.done && t.date <= today).length,
      upcoming: tasks.filter((t) => !t.done && t.date > today).length,
      completed: tasks.filter((t) => t.done).length,
    }),
    [tasks, today],
  )

  return (
    <div className="todo">
      <h3 className="todo__title">Task Log</h3>

      <div className="todo__input-row" onClick={(e) => e.stopPropagation()}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          className="focus-ring todo__text-input"
        />
      </div>
      <div className="todo__date-row" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="focus-ring todo__date-input"
        />
        <button onClick={addTask} className="focus-ring todo__add-btn">
          Add
        </button>
      </div>

      <div className="todo__tabs" onClick={(e) => e.stopPropagation()}>

        {(['today', 'upcoming', 'completed'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`focus-ring todo__tab ${tab === t ? 'todo__tab--active' : ''}`}
          >
            {t} · {counts[t]}
          </button>
        ))}
      </div>

      <div className="todo__list">
        <AnimatePresence initial={false}>
          {filtered.length === 0 && (
            <p className="todo__empty">{tab === 'completed' ? 'Nothing finished yet.' : 'All clear here.'}</p>
          )}
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="todo__item"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => toggleDone(t.id)}
                className={`focus-ring todo__item-check ${t.done ? 'todo__item-check--done' : ''}`}
              >
                {t.done && <Check size={10} strokeWidth={3} />}
              </button>
              <div className="todo__item-body">
                <p className={`todo__item-text ${t.done ? 'todo__item-text--done' : ''}`}>{t.text}</p>
                <p className="todo__item-date">{t.date}</p>
              </div>
              <button onClick={() => removeTask(t.id)} className="focus-ring todo__item-remove" aria-label="Delete task">
                <X size={12} strokeWidth={2.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
