import { AnalyticsCard } from './cards'
import type { AnalyticsSummary } from './types'
import { dateFormatter, moneyFormatter } from './utils'

export function AnalyticsOverview({
  analytics,
}: {
  analytics: AnalyticsSummary
}) {
  return (
    <div className='grid gap-4 lg:grid-cols-[2fr,1fr]'>
      <div className='grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3'>
        <AnalyticsCard label='Win rate' value={`${analytics.winRate.toFixed(0)}%`} />
        <AnalyticsCard label='Trading days' value={String(analytics.totalDays)} />
        <AnalyticsCard
          label='Avg day'
          value={moneyFormatter.format(analytics.averageDaily)}
          tone={analytics.averageDaily >= 0 ? 'profit' : 'loss'}
        />
        <AnalyticsCard
          label='Avg win'
          value={moneyFormatter.format(analytics.averageWin)}
          tone='profit'
        />
        <AnalyticsCard
          label='Avg loss'
          value={moneyFormatter.format(analytics.averageLoss)}
          tone='loss'
        />
        <AnalyticsCard
          label='Best day'
          value={analytics.bestDay ? moneyFormatter.format(analytics.bestDay.amount) : '$0.00'}
          tone='profit'
        />
      </div>

      <div className='rounded-[28px] border border-white/10 bg-white/[0.04] p-4 md:p-5'>
        <p className='text-sm text-white/55'>Performance notes</p>
        <div className='mt-4 space-y-3 text-sm text-white/75'>
          <div className='flex items-center justify-between gap-4'>
            <span>Worst day</span>
            <span className='font-semibold text-loss'>
              {analytics.worstDay ? moneyFormatter.format(analytics.worstDay.amount) : '$0.00'}
            </span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span>Longest win streak</span>
            <span className='font-semibold'>{analytics.longestWinStreak}</span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span>Longest loss streak</span>
            <span className='font-semibold'>{analytics.longestLossStreak}</span>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <span>Best day date</span>
            <span className='font-semibold'>
              {analytics.bestDay
                ? dateFormatter.format(new Date(`${analytics.bestDay.date}T00:00:00`))
                : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
