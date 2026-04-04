import type { Tone } from './types'

export function AnalyticsCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: Tone
}) {
  const toneClass =
    tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-white'

  return (
    <div className='rounded-[24px] border border-white/10 bg-white/[0.04] p-4'>
      <p className='text-xs uppercase tracking-[0.16em] text-white/45'>{label}</p>
      <p className={`mt-3 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

export function SummaryCard({
  label,
  value,
  tone = 'neutral',
  className = '',
}: {
  label: string
  value: string
  tone?: Tone
  className?: string
}) {
  const toneClass =
    tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-white'

  return (
    <div
      className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-5 ${className}`}>
      <p className='text-sm text-white/55'>{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className='rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center text-sm text-white/60'>
      {message}
    </div>
  )
}
