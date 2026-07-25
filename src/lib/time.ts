const IST = 'Asia/Kolkata'

export function nowIST(): Date {
  // Represent "now" but formatting always pinned to Asia/Kolkata below
  return new Date()
}

export function todayKey(d: Date = new Date()): string {
  // yyyy-mm-dd in IST, used as a stable storage key
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return `${map.year}-${map.month}-${map.day}`
}

export function formatClock(d: Date, hour12: boolean): { time: string; period: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const period = get('dayPeriod')
  const time = hour12
    ? `${get('hour')}:${get('minute')}:${get('second')}`
    : `${get('hour')}:${get('minute')}:${get('second')}`
  return { time, period }
}

export function formatDayDate(d: Date): { day: string; date: string } {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'long' }).format(d)
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: IST,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  return { day, date }
}

export function getISTHour(d: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: IST, hour: '2-digit', hour12: false })
  return parseInt(fmt.format(d), 10)
}

export function getISTHMS(d: Date = new Date()): { h: number; m: number; s: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10)
  return { h: get('hour') % 24, m: get('minute'), s: get('second') }
}
