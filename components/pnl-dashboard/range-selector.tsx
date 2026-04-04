import type { RangeKey } from './types'

const mobileOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'ytd', label: 'Year' },
  { key: 'total', label: 'All time' },
]

const desktopOptions: Array<{ key: RangeKey; label: string }> = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'ytd', label: 'YTD' },
  { key: 'total', label: 'Total' },
]

export function MobileRangeSelector({
  selectedRange,
  onSelect,
}: {
  selectedRange: RangeKey
  onSelect: (range: RangeKey) => void
}) {
  return (
    <section className='mt-6 md:hidden'>
      <div className='rounded-2xl border border-white/10 bg-[#102617]/95 p-1 shadow-glow backdrop-blur'>
        <div className='grid grid-cols-4 gap-1'>
          {mobileOptions.map((option) => {
            const isActive = selectedRange === option.key
            return (
              <button
                key={option.key}
                type='button'
                onClick={() => onSelect(option.key)}
                className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#42dd78] text-[#06210f]'
                    : 'text-white/65 hover:bg-white/[0.05]'
                }`}>
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function DesktopRangeSelector({
  selectedRange,
  onSelect,
}: {
  selectedRange: RangeKey
  onSelect: (range: RangeKey) => void
}) {
  return (
    <section className='mt-8 hidden flex-wrap gap-2 md:flex'>
      {desktopOptions.map((option) => {
        const isActive = selectedRange === option.key
        return (
          <button
            key={option.key}
            type='button'
            onClick={() => onSelect(option.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-accent text-slate-950'
                : 'border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            }`}>
            {option.label}
          </button>
        )
      })}
    </section>
  )
}
