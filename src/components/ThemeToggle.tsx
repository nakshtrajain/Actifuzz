import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import type { Theme } from '../lib/theme'

export default function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const isLight = theme === 'light'
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      aria-label={isLight ? 'Switch to night mode' : 'Switch to day mode'}
      className={`focus-ring theme-toggle ${isLight ? 'theme-toggle--light' : 'theme-toggle--dark'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`theme-toggle__thumb ${isLight ? 'theme-toggle__thumb--light' : 'theme-toggle__thumb--dark'}`}
      >
        {isLight ? (
          <Sun className="theme-toggle__icon" strokeWidth={2} />
        ) : (
          <Moon className="theme-toggle__icon" strokeWidth={2} />
        )}
      </motion.span>
    </motion.button>
  )
}