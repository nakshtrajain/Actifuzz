import { useCallback, useEffect, useState } from 'react'
import { getItem, setItem } from './storage'

export type Theme = 'light' | 'dark'
const KEY = 'actifuzz:theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getItem<Theme>(KEY, 'light').then((t) => {
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
      setLoaded(true)
    })
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', next)
      setItem(KEY, next)
      return next
    })
  }, [])

  return { theme, toggle, loaded }
}
