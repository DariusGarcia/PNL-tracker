import type { AnalyticsSummary, CalendarCell, PnlEntry, RangeKey, Totals } from './types'

export const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  signDisplay: 'always',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const monthHeadingFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

export const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function getToday() {
  return new Date().toISOString().slice(0, 10)
}

export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function getWeekStart(date = new Date()) {
  const next = new Date(date)
  const day = next.getDay()
  const distance = day === 0 ? 6 : day - 1
  next.setDate(next.getDate() - distance)
  return next.toISOString().slice(0, 10)
}

export function getMonthLabel(month: string) {
  return monthHeadingFormatter.format(new Date(`${month}-01T00:00:00`))
}

export function buildCalendarDays(month: string, entries: PnlEntry[]): CalendarCell[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const entryMap = new Map(entries.map((entry) => [entry.date, entry]))
  const cells: CalendarCell[] = []

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const weekday = new Date(`${date}T00:00:00`).getDay()

    if (weekday === 0 || weekday === 6) {
      continue
    }

    if (cells.length === 0) {
      const firstOffset = weekday - 1
      for (let index = 0; index < firstOffset; index += 1) {
        cells.push({ key: `empty-${index}` })
      }
    } else {
      const lastFilledIndex = cells.length % 5
      if (lastFilledIndex === 0) {
        const offset = weekday - 1
        for (let index = 0; index < offset; index += 1) {
          cells.push({ key: `empty-${date}-${index}` })
        }
      }
    }

    cells.push({
      key: date,
      dayNumber: day,
      entry: entryMap.get(date),
    })
  }

  return cells
}

export function formatCalendarAmount(amount?: number) {
  if (amount == null) return '--'

  const absoluteAmount = Math.abs(amount)

  if (absoluteAmount >= 1000) {
    const compactValue =
      absoluteAmount >= 10000
        ? (absoluteAmount / 1000).toFixed(1)
        : (absoluteAmount / 1000).toFixed(2)

    return `${amount >= 0 ? '+' : '-'}${compactValue.replace(/\.0$/, '')}K`
  }

  return `${amount >= 0 ? '+' : '-'}${absoluteAmount.toFixed(2)}`
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const next = new Date(year, monthNumber - 1 + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

export function getRangeLabel(range: RangeKey, month: string) {
  if (range === 'weekly') return 'Weekly P&L'
  if (range === 'monthly') return `${month} P&L`
  if (range === 'ytd') return 'YTD P&L'
  return 'Total P&L'
}

export function calculateTotals(entries: PnlEntry[]): Totals {
  return entries.reduce(
    (acc, entry) => {
      acc.net += entry.amount
      if (entry.amount > 0) acc.profitableDays += 1
      if (entry.amount < 0) acc.losingDays += 1
      return acc
    },
    { net: 0, profitableDays: 0, losingDays: 0 },
  )
}

export function calculateAnalytics(entries: PnlEntry[]): AnalyticsSummary {
  const winningEntries = entries.filter((entry) => entry.amount > 0)
  const losingEntries = entries.filter((entry) => entry.amount < 0)
  const totalDays = entries.length
  const averageDaily =
    totalDays > 0
      ? entries.reduce((sum, entry) => sum + entry.amount, 0) / totalDays
      : 0
  const bestDay =
    entries.length > 0
      ? entries.reduce((best, entry) => (entry.amount > best.amount ? entry : best))
      : null
  const worstDay =
    entries.length > 0
      ? entries.reduce((worst, entry) => (entry.amount < worst.amount ? entry : worst))
      : null
  const winRate = totalDays > 0 ? (winningEntries.length / totalDays) * 100 : 0
  const averageWin =
    winningEntries.length > 0
      ? winningEntries.reduce((sum, entry) => sum + entry.amount, 0) / winningEntries.length
      : 0
  const averageLoss =
    losingEntries.length > 0
      ? losingEntries.reduce((sum, entry) => sum + entry.amount, 0) / losingEntries.length
      : 0

  let currentStreakType: 'win' | 'loss' | 'flat' | null = null
  let currentStreak = 0
  let longestWinStreak = 0
  let longestLossStreak = 0

  const chronological = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  for (const entry of chronological) {
    const nextType = entry.amount > 0 ? 'win' : entry.amount < 0 ? 'loss' : 'flat'
    if (nextType === currentStreakType) {
      currentStreak += 1
    } else {
      currentStreakType = nextType
      currentStreak = 1
    }

    if (nextType === 'win') {
      longestWinStreak = Math.max(longestWinStreak, currentStreak)
    }

    if (nextType === 'loss') {
      longestLossStreak = Math.max(longestLossStreak, currentStreak)
    }
  }

  return {
    totalDays,
    averageDaily,
    bestDay,
    worstDay,
    winRate,
    averageWin,
    averageLoss,
    longestWinStreak,
    longestLossStreak,
  }
}
