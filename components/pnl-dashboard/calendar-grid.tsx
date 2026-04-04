import type { CalendarCell } from './types'
import { daysOfWeek, formatCalendarAmount } from './utils'

export function MonthNavigator({
  monthLabel,
  onPrevious,
  onNext,
  compact = false,
}: {
  monthLabel: string
  onPrevious: () => void
  onNext: () => void
  compact?: boolean
}) {
  return (
    <div className='mb-4 flex items-center justify-between px-1'>
      <button
        type='button'
        onClick={onPrevious}
        className={`rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/[0.06] ${
          compact ? 'px-3 py-1 text-lg' : 'px-3 py-2 text-sm'
        }`}
        aria-label='Previous month'>
        {'<'}
      </button>
      <p
        className={`font-semibold uppercase text-white/72 ${
          compact ? 'text-sm tracking-[0.22em]' : 'min-w-40 text-center text-sm tracking-[0.18em]'
        }`}>
        {monthLabel}
      </p>
      <button
        type='button'
        onClick={onNext}
        className={`rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/[0.06] ${
          compact ? 'px-3 py-1 text-lg' : 'px-3 py-2 text-sm'
        }`}
        aria-label='Next month'>
        {'>'}
      </button>
    </div>
  )
}

export function CalendarGrid({
  calendarDays,
  onEntryClick,
  compact = false,
}: {
  calendarDays: CalendarCell[]
  onEntryClick: (entry: CalendarCell['entry']) => void
  compact?: boolean
}) {
  return (
    <>
      <div className='mb-2 grid grid-cols-5 gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10'>
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className={`bg-white/[0.05] text-center font-semibold uppercase text-white/45 ${
              compact ? 'px-1 py-3 text-[11px] tracking-[0.16em]' : 'px-2 py-4 text-xs tracking-[0.18em]'
            }`}>
            {day}
          </div>
        ))}
      </div>

      <div
        className={`grid grid-cols-5 gap-px overflow-hidden border border-white/10 bg-white/10 ${
          compact ? 'rounded-[28px]' : 'rounded-[32px]'
        }`}>
        {calendarDays.map((cell) => {
          if (!cell.dayNumber) {
            return (
              <div
                key={cell.key}
                className={`${compact ? 'aspect-[0.96]' : 'aspect-[1.08]'} bg-[#0d1624]`}
              />
            )
          }

          const amount = cell.entry?.amount
          const formattedAmount = formatCalendarAmount(amount)
          const tileClass =
            amount == null
              ? 'bg-[#111a28] text-white/78'
              : amount >= 0
                ? 'bg-[#d7f4ef] text-[#19c7b3]'
                : 'bg-[#f5dfe6] text-[#ea5b76]'

          return (
            <article
              key={cell.key}
              onClick={() => onEntryClick(cell.entry)}
              className={`${compact ? 'aspect-[0.96] p-2.5' : 'aspect-[1.08] p-4'} transition ${
                cell.entry ? 'cursor-pointer hover:brightness-[1.03]' : ''
              } ${tileClass}`}>
              <div className='flex h-full flex-col items-center justify-between'>
                <p
                  className={`${compact ? 'text-sm' : 'text-2xl'} font-medium ${
                    amount == null ? 'text-white/58' : 'text-[#253042]'
                  }`}>
                  {cell.dayNumber}
                </p>
                <p
                  className={`text-center font-semibold leading-tight ${
                    amount == null
                      ? compact
                        ? 'text-[13px] text-white/45'
                        : 'text-base text-white/45'
                      : compact
                        ? formattedAmount.length >= 8
                          ? 'text-[11px]'
                          : 'text-[13px]'
                        : formattedAmount.length >= 8
                          ? 'text-lg'
                          : 'text-[1.65rem]'
                  }`}>
                  {formattedAmount}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
