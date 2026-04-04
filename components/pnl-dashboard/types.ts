export type PnlEntry = {
  id: string
  amount: number
  date: string
  note?: string
}

export type CalendarCell = {
  key: string
  dayNumber?: number
  entry?: PnlEntry
}

export type RangeKey = 'weekly' | 'monthly' | 'ytd' | 'total'

export type MobileTabKey = 'calendar' | 'analytics' | 'settings'

export type Tone = 'profit' | 'loss' | 'neutral'

export type Totals = {
  net: number
  profitableDays: number
  losingDays: number
}

export type AnalyticsSummary = {
  totalDays: number
  averageDaily: number
  bestDay: PnlEntry | null
  worstDay: PnlEntry | null
  winRate: number
  averageWin: number
  averageLoss: number
  longestWinStreak: number
  longestLossStreak: number
}
