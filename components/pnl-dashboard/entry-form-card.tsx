import type { FormEvent } from 'react'

export function EntryFormCard({
  isEntryFormOpen,
  onToggleOpen,
  onSubmit,
  date,
  amount,
  note,
  onDateChange,
  onAmountChange,
  onNoteChange,
  canEdit,
  isSaving,
}: {
  isEntryFormOpen: boolean
  onToggleOpen: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  date: string
  amount: string
  note: string
  onDateChange: (value: string) => void
  onAmountChange: (value: string) => void
  onNoteChange: (value: string) => void
  canEdit: boolean
  isSaving: boolean
}) {
  return (
    <div className='rounded-[28px] border border-white/10 bg-panel/80 p-6'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold'>Log today&apos;s result</h2>
          <p className='mt-2 text-sm text-white/60'>
            Save one entry per day. Updating the same date will replace that day&apos;s value.
          </p>
        </div>
        <button
          type='button'
          onClick={onToggleOpen}
          className='rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]'>
          {isEntryFormOpen ? 'Minimize' : 'Expand'}
        </button>
      </div>

      {isEntryFormOpen ? (
        <form onSubmit={onSubmit} className='mt-6 space-y-4'>
          <label className='block'>
            <span className='mb-2 block text-sm text-white/70'>Date</span>
            <input
              type='date'
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              disabled={!canEdit}
              className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm text-white/70'>Profit / loss</span>
            <input
              type='number'
              step='0.01'
              placeholder='Example: 240.50 or -75.25'
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              disabled={!canEdit}
              className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm text-white/70'>Notes (optional)</span>
            <textarea
              rows={3}
              placeholder='What worked or what hurt today?'
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={!canEdit}
              className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>

          <button
            type='submit'
            disabled={!canEdit || isSaving}
            className='w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60'>
            {isSaving ? 'Saving...' : 'Save daily P&L'}
          </button>
        </form>
      ) : (
        <button
          type='button'
          onClick={onToggleOpen}
          className='relative mt-6 block w-full rounded-2xl border-2 border-dashed border-white/15 p-10 text-center transition hover:border-white/25 focus:outline-2 focus:outline-offset-2 focus:outline-accent'>
          <svg
            fill='none'
            stroke='currentColor'
            viewBox='0 0 48 48'
            aria-hidden='true'
            className='mx-auto h-12 w-12 text-white/40'>
            <path
              d='M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          <span className='mt-2 block text-sm font-semibold text-white'>
            Add a new daily P&amp;L entry
          </span>
        </button>
      )}
    </div>
  )
}
