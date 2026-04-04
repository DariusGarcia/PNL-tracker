import type { FormEvent } from 'react'

import type { PnlEntry } from './types'
import { dateFormatter } from './utils'

export function EditEntryModal({
  editingEntry,
  editDate,
  editAmount,
  editNote,
  isUpdatingEntry,
  isDeletingEntry,
  onClose,
  onSubmit,
  onDelete,
  onDateChange,
  onAmountChange,
  onNoteChange,
}: {
  editingEntry: PnlEntry
  editDate: string
  editAmount: string
  editNote: string
  isUpdatingEntry: boolean
  isDeletingEntry: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDelete: () => void
  onDateChange: (value: string) => void
  onAmountChange: (value: string) => void
  onNoteChange: (value: string) => void
}) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md rounded-[28px] border border-white/10 bg-[#0f1a2b] p-6 shadow-glow'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-white/45'>Edit entry</p>
            <h3 className='mt-2 text-2xl font-semibold text-white'>
              {dateFormatter.format(new Date(`${editingEntry.date}T00:00:00`))}
            </h3>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={isUpdatingEntry || isDeletingEntry}
            className='rounded-full border border-white/10 px-3 py-1 text-sm text-white/70'>
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className='mt-6 space-y-4'>
          <label className='block'>
            <span className='mb-2 block text-sm text-white/70'>Date</span>
            <input
              type='date'
              value={editDate}
              onChange={(event) => onDateChange(event.target.value)}
              disabled={isUpdatingEntry || isDeletingEntry}
              className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm text-white/70'>Profit / loss</span>
            <input
              type='number'
              step='0.01'
              value={editAmount}
              onChange={(event) => onAmountChange(event.target.value)}
              disabled={isUpdatingEntry || isDeletingEntry}
              className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm text-white/70'>Notes</span>
            <textarea
              rows={3}
              value={editNote}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={isUpdatingEntry || isDeletingEntry}
              className='w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60'
            />
          </label>

          <div className='flex flex-col gap-3 sm:flex-row'>
            <button
              type='button'
              onClick={onDelete}
              disabled={isUpdatingEntry || isDeletingEntry}
              className='w-full rounded-full border border-loss/40 bg-loss/10 px-5 py-3 text-sm font-semibold text-loss transition hover:bg-loss/15 disabled:cursor-not-allowed disabled:opacity-60'>
              {isDeletingEntry ? 'Deleting...' : 'Delete entry'}
            </button>
            <button
              type='submit'
              disabled={isUpdatingEntry || isDeletingEntry}
              className='w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60'>
              {isUpdatingEntry ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
